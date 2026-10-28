import { z } from 'zod';
import type { CambioPendiente, EntidadSincronizable } from './entidades';
import type {
    ClaveEntidad, EntidadEditable, EventoSincronizacion, IBloqueador, IPersistenciaProyectos,
    ISincronizador, VersionRemota,
} from './interfacesSincronizacion';
import {
    ErrorBloqueoOcupado, ErrorBloqueoPerdido, ErrorPermiso, ErrorServidorNoDisponible, ErrorSinConexion,
    ErrorSincronizacion, ErrorVersionDesactualizada,
} from './erroresSincronizacion';
import { exigirRol, obtenerRolActivo } from './permisos';

/* ---------------- Tipos públicos ---------------- */

export const ENTIDADES_EDITABLES: readonly EntidadEditable[] = ['archivo', 'evento', 'meta', 'tarea'];
export const esEditable = (e: string): e is EntidadEditable => (ENTIDADES_EDITABLES as readonly string[]).includes(e);

/**
 * Costura con tus módulos existentes (archivos, eventos, metas, tareas, nodos).
 * El servicio de sincronización no sabe cómo se guardan: lo hace cada manejador.
 */
export interface ManejadorEntidad {
    /** Estado local actual, serializable, para subirlo al servidor. Solo para entidades editables. */
    leer?(idProyecto: number, idGlobal: string): Promise<{ datos: unknown; contenido?: Uint8Array } | null>;
    /**
     * Aplica un cambio recibido (crear/modificar/eliminar/mover) sobre la BD local.
     * DEBE ser un upsert idempotente y NO debe llamar a registrarCambio (no re-encolar).
     * Para 'modificar' de editables: payload = { idGlobal, version, datos, ruta }.
     */
    aplicarCambio(idProyecto: number, cambio: CambioPendiente, contenido?: Uint8Array): Promise<void>;
}
export type RegistroManejadores = Partial<Record<EntidadSincronizable, ManejadorEntidad>>;

export interface InfoRemota {
    titular: { nombre: string; mail: string } | null;
    desde: Date | null;
    version: number;
    ultimaModificacion: Date | null;
    ultimoAutor: string | null;
}
export type MotivoLectura = 'bloqueado' | 'sin_conexion' | 'lector' | 'eliminado' | 'conflicto';
export type ResultadoInicio =
    | { modo: 'local' }
    | { modo: 'edicion'; versionBase: number; venceEn: Date | null; sinConexion: boolean }
    | ({ modo: 'solo_lectura'; motivo: MotivoLectura } & InfoRemota);
export type ResultadoGuardado =
    | { resultado: 'local' }
    | { resultado: 'subido'; version: number }
    | { resultado: 'pendiente'; motivo: 'sin_conexion' | 'sin_bloqueo_remoto' };
export interface ResumenSubida { subidas: number; bloqueadas: number; conflictos: number; fallidas: number }
export interface ConflictoRemoto { version: number; datos: unknown; ruta: string | null; autor: string | null; fecha: string | Date | null }

/** Lo que ve la pantalla de resolución: las dos versiones, con su contenido (para archivos). */
export interface DetalleConflicto {
    local: { datos: unknown; contenido?: Uint8Array };
    remoto: ConflictoRemoto & { contenido?: Uint8Array };
}

export interface OpcionesEdicion {
    latidoMs: number;                    // cada cuánto se renueva el bloqueo (TTL del servidor: 120 s)
    permitirEdicionSinConexion: boolean; // false = sin conexión solo se puede ver
}

/* ---------------- DTOs ---------------- */

const ClaveDTO = z.object({
    idProyecto: z.number().int(),
    idUsuario: z.number().int(),
    entidad: z.enum(['archivo', 'evento', 'meta', 'tarea']),
    idGlobal: z.string().uuid(),
});
const ResolverConflictoDTO = ClaveDTO.extend({
    eleccion: z.enum(['local', 'remota', 'mezcla']),
    datosMezcla: z.unknown().optional(),
    /** Texto final de la mezcla (solo archivos de texto). */
    contenidoMezcla: z.string().optional(),
});
const ProyectoUsuarioDTO = z.object({ idProyecto: z.number().int(), idUsuario: z.number().int() });

interface SesionActiva {
    idProyecto: number; idRemoto: string; clave: ClaveEntidad;
    timer: NodeJS.Timeout; fallosRed: number; perdida: boolean;
}
interface EstadoLocal { version: number; pendiente: boolean; conflicto: ConflictoRemoto | null }

const esRed = (e: unknown) => e instanceof ErrorSinConexion || e instanceof ErrorServidorNoDisponible;

/**
 * Edición asincrónica con bloqueo: un solo editor por elemento, los demás ven la última
 * versión con la hora. Cada guardado sube un número de versión; si la base no coincide, hay conflicto.
 */
export class EdicionCompartida {
    private readonly sesiones = new Map<string, SesionActiva>();

    constructor(
        private readonly p: IPersistenciaProyectos,
        private readonly sync: ISincronizador & IBloqueador,
        private readonly manejadores: RegistroManejadores,
        private readonly emitir: (e: EventoSincronizacion) => void = () => undefined,
        private readonly opc: OpcionesEdicion = { latidoMs: 30_000, permitirEdicionSinConexion: false },
    ) {}

    /* ===================== Abrir / guardar / cerrar ===================== */

    async iniciar(entrada: unknown): Promise<ResultadoInicio> {
        const dto = ClaveDTO.parse(entrada);
        const rol = await obtenerRolActivo(this.p, dto.idProyecto, dto.idUsuario);
        if (!rol) throw new ErrorPermiso('El usuario no es miembro del proyecto');
        const idRemoto = await this.idRemoto(dto.idProyecto);
        if (!idRemoto) return { modo: 'local' }; // proyecto sin compartir: edición libre, sin bloqueos

        const clave: ClaveEntidad = { entidad: dto.entidad, idGlobal: dto.idGlobal };
        const local = await this.estadoLocal(dto.idProyecto, clave);
        const soloLectura = (motivo: MotivoLectura, info: Partial<InfoRemota> = {}): ResultadoInicio => ({
            modo: 'solo_lectura', motivo, titular: null, desde: null, version: local.version,
            ultimaModificacion: null, ultimoAutor: null, ...info,
        });

        if (local.conflicto) return soloLectura('conflicto');
        await this.asegurarConexion();

        if (rol === 'lector') return soloLectura('lector', await this.infoRemota(idRemoto, clave).catch(() => ({})));
        if (!this.sync.estaConectado()) return this.sinConexion(local, soloLectura);

        let est;
        try { est = await this.sync.adquirirBloqueo(idRemoto, clave); }
        catch (e) { if (esRed(e)) return this.sinConexion(local, soloLectura); throw e; }

        const info: InfoRemota = {
            titular: est.titular && { nombre: est.titular.nombre, mail: est.titular.mail },
            desde: est.desde, version: est.version,
            ultimaModificacion: est.ultimaModificacion, ultimoAutor: est.ultimoAutor,
        };
        if (!est.concedido) return soloLectura('bloqueado', info);
        if (est.eliminado) { await this.soltar(idRemoto, clave); return soloLectura('eliminado', info); }

        if (est.version > local.version) {
            if (local.pendiente) {
                // Edité sin conexión y mientras tanto el servidor avanzó: conflicto.
                await this.registrarConflicto(dto.idProyecto, idRemoto, clave);
                await this.soltar(idRemoto, clave);
                this.emitir({ tipo: 'conflicto_detectado', idProyecto: dto.idProyecto, clave });
                return soloLectura('conflicto', info);
            }
            await this.traerUltima(dto.idProyecto, idRemoto, clave); // me actualizo antes de editar
        }
        this.abrirSesion(dto.idProyecto, idRemoto, clave);
        return { modo: 'edicion', versionBase: Math.max(est.version, local.version), venceEn: est.venceEn, sinConexion: false };
    }

    /**
     * Llamar DESPUÉS de que tu módulo guardó localmente. Lee el estado local desde el manejador
     * y lo sube con la versión base. Si no se puede subir, queda pendiente (no se pierde nada).
     */
    async guardar(entrada: unknown): Promise<ResultadoGuardado> {
        const dto = ClaveDTO.parse(entrada);
        await exigirRol(this.p, dto.idProyecto, dto.idUsuario, ['propietario', 'editor']);
        const idRemoto = await this.idRemoto(dto.idProyecto);
        if (!idRemoto) return { resultado: 'local' };

        const clave: ClaveEntidad = { entidad: dto.entidad, idGlobal: dto.idGlobal };
        const local = await this.estadoLocal(dto.idProyecto, clave);
        if (local.conflicto) throw new ErrorSincronizacion('CONFLICTO_PENDIENTE', 'Hay un conflicto sin resolver en este elemento.');

        const sesion = this.sesiones.get(this.k(dto.idProyecto, clave));
        if (sesion?.perdida) {
            await this.marcarPendiente(dto.idProyecto, dto.entidad, dto.idGlobal);
            throw new ErrorBloqueoPerdido();
        }
        if (!sesion || !this.sync.estaConectado()) {
            await this.marcarPendiente(dto.idProyecto, dto.entidad, dto.idGlobal);
            return { resultado: 'pendiente', motivo: this.sync.estaConectado() ? 'sin_bloqueo_remoto' : 'sin_conexion' };
        }

        const dato = await this.manejadores[dto.entidad]?.leer?.(dto.idProyecto, dto.idGlobal);
        if (!dato) throw new ErrorSincronizacion('NO_ENCONTRADO', 'No se encontró el elemento local para subir.');

        try {
            const v = await this.sync.guardarVersion(idRemoto, clave, local.version, dato.datos, dato.contenido);
            await this.guardarEstado(dto.idProyecto, clave, { version: v.version, pendiente: false });
            await this.descartarColaDe(dto.idProyecto, clave);
            return { resultado: 'subido', version: v.version };
        } catch (e) {
            await this.marcarPendiente(dto.idProyecto, dto.entidad, dto.idGlobal); // el trabajo local nunca se pierde
            if (e instanceof ErrorVersionDesactualizada) {
                await this.registrarConflicto(dto.idProyecto, idRemoto, clave).catch(() => undefined);
                this.emitir({ tipo: 'conflicto_detectado', idProyecto: dto.idProyecto, clave });
            } else if (e instanceof ErrorBloqueoPerdido) {
                this.perder(sesion);
            } else if (esRed(e)) {
                return { resultado: 'pendiente', motivo: 'sin_conexion' };
            }
            throw e;
        }
    }

    async finalizar(entrada: unknown): Promise<void> {
        const dto = ClaveDTO.parse(entrada);
        const clave: ClaveEntidad = { entidad: dto.entidad, idGlobal: dto.idGlobal };
        const s = this.sesiones.get(this.k(dto.idProyecto, clave));
        if (!s) return;
        clearInterval(s.timer);
        this.sesiones.delete(this.k(dto.idProyecto, clave));
        if (!s.perdida) await this.soltar(s.idRemoto, clave); // si falla, vence solo a los 2 minutos
    }

    /** Al cerrar la app: libera todos los bloqueos que este cliente tiene tomados. */
    async cerrarTodas(): Promise<void> {
        const todas = [...this.sesiones.values()];
        this.sesiones.clear();
        await Promise.all(todas.map(async s => {
            clearInterval(s.timer);
            if (!s.perdida) await this.soltar(s.idRemoto, s.clave);
        }));
    }

    /** Quién la edita y cuál es la última versión, SIN tomar el bloqueo (para la vista de solo lectura). */
    async consultar(entrada: unknown): Promise<InfoRemota> {
        const dto = ClaveDTO.parse(entrada);
        const clave: ClaveEntidad = { entidad: dto.entidad, idGlobal: dto.idGlobal };
        const local = await this.estadoLocal(dto.idProyecto, clave);
        const idRemoto = await this.idRemoto(dto.idProyecto);
        const vacio: InfoRemota = { titular: null, desde: null, version: local.version, ultimaModificacion: null, ultimoAutor: null };
        if (!idRemoto || !this.sync.estaConectado()) return vacio;
        try { return await this.infoRemota(idRemoto, clave); }
        catch (e) { if (esRed(e)) return vacio; throw e; }
    }

    /* ===================== Sincronización de ediciones ===================== */

    async marcarPendiente(idProyecto: number, entidad: EntidadEditable, idGlobal: string): Promise<void> {
        await this.guardarEstado(idProyecto, { entidad, idGlobal }, { pendiente: true });
    }

    /** Sube las ediciones hechas sin conexión (o sin bloqueo). Detecta conflictos; nunca pisa. */
    async subirPendientes(idProyecto: number): Promise<ResumenSubida> {
        const r: ResumenSubida = { subidas: 0, bloqueadas: 0, conflictos: 0, fallidas: 0 };
        const idRemoto = await this.idRemoto(idProyecto);
        if (!idRemoto || !this.sync.estaConectado()) return r;
        const filas = await this.p.ejecutar(
            `SELECT entidad, id_global, version_remota FROM estado_entidad_remota
             WHERE id_proyecto = $1 AND pendiente AND conflicto_remoto IS NULL`, [idProyecto]);

        for (const f of filas) {
            const clave: ClaveEntidad = { entidad: f.entidad, idGlobal: f.id_global };
            if (this.sesiones.has(this.k(idProyecto, clave))) continue; // la están editando acá: sube con guardar()
            try {
                const est = await this.sync.adquirirBloqueo(idRemoto, clave);
                if (!est.concedido) { r.bloqueadas++; continue; }
                try {
                    if (est.eliminado) {
                        await this.guardarEstado(idProyecto, clave, { pendiente: false });
                        r.fallidas++; continue;
                    }
                    if (est.version > f.version_remota) {
                        await this.registrarConflicto(idProyecto, idRemoto, clave);
                        this.emitir({ tipo: 'conflicto_detectado', idProyecto, clave });
                        r.conflictos++; continue;
                    }
                    const dato = await this.manejadores[clave.entidad]?.leer?.(idProyecto, clave.idGlobal);
                    if (!dato) {
                        console.warn('[sync] leer() devolvió null para', clave);
                        r.fallidas++; continue;
                    }
                    const v = await this.sync.guardarVersion(idRemoto, clave, f.version_remota, dato.datos, dato.contenido);
                    await this.guardarEstado(idProyecto, clave, { version: v.version, pendiente: false });
                    await this.descartarColaDe(idProyecto, clave);
                    r.subidas++;
                } finally { await this.soltar(idRemoto, clave); }
            } catch (e) {
                if (e instanceof ErrorVersionDesactualizada) {
                    await this.registrarConflicto(idProyecto, idRemoto, clave).catch(() => undefined);
                    this.emitir({ tipo: 'conflicto_detectado', idProyecto, clave });
                    r.conflictos++;
                } else {
                    console.warn('[sync] subirPendientes falló para', clave, e);
                    r.fallidas++; // queda pendiente: se reintenta en la próxima sincronización
                }
            }
        }
        return r;
    }

    /** Aplica un cambio bajado del servidor. Protege las ediciones locales pendientes. */
    async aplicarCambioRemoto(idProyecto: number, cambio: CambioPendiente): Promise<void> {
        const m = this.manejadores[cambio.entidad];
        if (!m) return; // entidades sin manejador (p. ej. 'miembro') se ignoran
        const p = (cambio.payload ?? {}) as { idGlobal?: string; version?: number; ruta?: string | null };

        if (esEditable(cambio.entidad) && cambio.operacion === 'modificar' && p.idGlobal && typeof p.version === 'number') {
            const clave: ClaveEntidad = { entidad: cambio.entidad, idGlobal: p.idGlobal };
            const local = await this.estadoLocal(idProyecto, clave);
            if (p.version <= local.version) return; // ya la tengo
            if (local.pendiente) {
                // Tengo cambios locales sin subir y llegó una versión nueva: NO se pisa, se registra el conflicto.
                const d = (cambio.payload as { datos?: unknown }).datos;
                await this.guardarEstado(idProyecto, clave, {
                    pendiente: true,
                    conflicto: { version: p.version, datos: d, ruta: p.ruta ?? null, autor: null, fecha: cambio.fechaCambio },
                });
                this.emitir({ tipo: 'conflicto_detectado', idProyecto, clave });
                return;
            }
            const contenido = p.ruta ? await this.sync.descargarContenido(p.ruta) : undefined;
            await m.aplicarCambio(idProyecto, { ...cambio, idProyecto }, contenido);
            await this.guardarEstado(idProyecto, clave, { version: p.version, pendiente: false, conflicto: null });
            return;
        }
        await m.aplicarCambio(idProyecto, { ...cambio, idProyecto });
    }

    /* ===================== Conflictos ===================== */

    async listarConflictos(entrada: unknown): Promise<{ entidad: EntidadEditable; idGlobal: string }[]> {
        const dto = ProyectoUsuarioDTO.parse(entrada);
        await exigirRol(this.p, dto.idProyecto, dto.idUsuario, ['propietario', 'editor', 'lector']);
        const filas = await this.p.ejecutar(
            `SELECT entidad, id_global FROM estado_entidad_remota WHERE id_proyecto = $1 AND conflicto_remoto IS NOT NULL`,
            [dto.idProyecto]);
        return filas.map(f => ({ entidad: f.entidad, idGlobal: f.id_global }));
    }

    /**
     * Devuelve las dos versiones para mostrarlas en la pantalla de resolución.
     * Para archivos incluye el contenido de ambas (local y remota).
     */
    async obtenerConflicto(entrada: unknown): Promise<DetalleConflicto> {
        const dto = ClaveDTO.parse(entrada);
        const clave: ClaveEntidad = { entidad: dto.entidad, idGlobal: dto.idGlobal };
        const e = await this.estadoLocal(dto.idProyecto, clave);
        if (!e.conflicto) throw new ErrorSincronizacion('NO_ENCONTRADO', 'No hay conflicto para este elemento.');
        const l = await this.manejadores[dto.entidad]?.leer?.(dto.idProyecto, dto.idGlobal);
        const contenidoRemoto = e.conflicto.ruta
            ? await this.sync.descargarContenido(e.conflicto.ruta).catch(() => undefined)
            : undefined;
        return {
            local: { datos: l?.datos ?? null, contenido: l?.contenido },
            remoto: { ...e.conflicto, contenido: contenidoRemoto },
        };
    }

    /**
     * 'remota'  -> descarto lo mío y aplico lo del servidor.
     * 'local'   -> conservo lo mío y lo subo como versión nueva encima de la remota.
     * 'mezcla'  -> aplico datosMezcla / contenidoMezcla localmente y lo subo.
     */
    async resolverConflicto(entrada: unknown): Promise<{ version: number }> {
        const dto = ResolverConflictoDTO.parse(entrada);
        await exigirRol(this.p, dto.idProyecto, dto.idUsuario, ['propietario', 'editor']);
        const clave: ClaveEntidad = { entidad: dto.entidad, idGlobal: dto.idGlobal };
        const e = await this.estadoLocal(dto.idProyecto, clave);
        const remoto = e.conflicto;
        if (!remoto) throw new ErrorSincronizacion('NO_ENCONTRADO', 'No hay conflicto para resolver.');
        const m = this.manejadores[dto.entidad];
        const idRemoto = await this.idRemoto(dto.idProyecto);
        if (!m || !idRemoto) throw new ErrorSincronizacion('NO_ENCONTRADO', 'El elemento no está sincronizado.');

        if (dto.eleccion === 'remota') {
            await this.aplicarVersion(dto.idProyecto, clave, {
                version: remoto.version, datos: remoto.datos, ruta: remoto.ruta, autor: remoto.autor ?? '',
                fecha: new Date(remoto.fecha ?? Date.now()), eliminado: false,
            });
            return { version: remoto.version };
        }

        const est = await this.sync.adquirirBloqueo(idRemoto, clave);
        if (!est.concedido) throw new ErrorBloqueoOcupado(est.titular?.nombre ?? 'Otra persona', est.desde);
        try {
            if (est.version !== remoto.version) {
                // Mientras resolvías, alguien guardó otra versión: hay que volver a comparar.
                await this.registrarConflicto(dto.idProyecto, idRemoto, clave);
                throw new ErrorVersionDesactualizada(est.version);
            }
            if (dto.eleccion === 'mezcla') {
                const actual = await m.leer?.(dto.idProyecto, dto.idGlobal);
                await m.aplicarCambio(
                    dto.idProyecto,
                    this.cambioDesde(dto.idProyecto, clave, {
                        version: est.version, datos: dto.datosMezcla ?? actual?.datos,
                        ruta: null, autor: '', fecha: new Date(), eliminado: false,
                    }),
                    dto.contenidoMezcla !== undefined ? new TextEncoder().encode(dto.contenidoMezcla) : undefined,
                );
            }
            const dato = await m.leer?.(dto.idProyecto, dto.idGlobal);
            if (!dato) throw new ErrorSincronizacion('NO_ENCONTRADO', 'No se encontró el elemento local.');
            const v = await this.sync.guardarVersion(idRemoto, clave, est.version, dato.datos, dato.contenido);
            await this.guardarEstado(dto.idProyecto, clave, { version: v.version, pendiente: false, conflicto: null });
            await this.descartarColaDe(dto.idProyecto, clave);
            return { version: v.version };
        } finally { await this.soltar(idRemoto, clave); }
    }

    /* ===================== Internos ===================== */

    private k = (idProyecto: number, c: ClaveEntidad) => `${idProyecto}:${c.entidad}:${c.idGlobal}`;

    private async idRemoto(idProyecto: number): Promise<string | null> {
        const f = await this.p.ejecutar(`SELECT id_remoto FROM proyectos WHERE id_proyecto = $1`, [idProyecto]);
        if (!f[0]) throw new ErrorSincronizacion('NO_ENCONTRADO', 'Proyecto inexistente');
        return f[0].id_remoto ?? null;
    }

    private async asegurarConexion(): Promise<void> {
        if (this.sync.estaConectado()) return;
        try { await this.sync.conectar(); } catch { /* sigue sin conexión: se resuelve más abajo */ }
    }

    private sinConexion(local: EstadoLocal, soloLectura: (m: MotivoLectura) => ResultadoInicio): ResultadoInicio {
        return this.opc.permitirEdicionSinConexion
            ? { modo: 'edicion', versionBase: local.version, venceEn: null, sinConexion: true }
            : soloLectura('sin_conexion');
    }

    private async infoRemota(idRemoto: string, clave: ClaveEntidad): Promise<InfoRemota> {
        const e = await this.sync.consultarBloqueo(idRemoto, clave);
        return {
            titular: e.titular && { nombre: e.titular.nombre, mail: e.titular.mail },
            desde: e.desde, version: e.version, ultimaModificacion: e.ultimaModificacion, ultimoAutor: e.ultimoAutor,
        };
    }

    private async soltar(idRemoto: string, clave: ClaveEntidad): Promise<void> {
        await this.sync.liberarBloqueo(idRemoto, clave).catch(() => undefined);
    }

    private abrirSesion(idProyecto: number, idRemoto: string, clave: ClaveEntidad): void {
        const key = this.k(idProyecto, clave);
        const previa = this.sesiones.get(key);
        if (previa) clearInterval(previa.timer);
        const s: SesionActiva = { idProyecto, idRemoto, clave, fallosRed: 0, perdida: false, timer: undefined as unknown as NodeJS.Timeout };
        s.timer = setInterval(() => void this.latir(s), this.opc.latidoMs);
        this.sesiones.set(key, s);
    }

    private async latir(s: SesionActiva): Promise<void> {
        try {
            const vigente = await this.sync.renovarBloqueo(s.idRemoto, s.clave);
            if (s.fallosRed > 0) { s.fallosRed = 0; this.emitir({ tipo: 'conexion_recuperada' }); }
            if (vigente) return;
            // Venció (p. ej. por un corte largo). Si nadie tocó nada, lo retomo en silencio.
            const est = await this.sync.adquirirBloqueo(s.idRemoto, s.clave);
            const local = await this.estadoLocal(s.idProyecto, s.clave);
            if (est.concedido && est.version <= local.version) return;
            if (est.concedido) await this.soltar(s.idRemoto, s.clave);
            this.perder(s);
        } catch (e) {
            if (esRed(e)) { if (++s.fallosRed === 1) this.emitir({ tipo: 'conexion_perdida' }); }
            else if (e instanceof ErrorPermiso) this.perder(s); // me sacaron del proyecto
        }
    }

    private perder(s: SesionActiva): void {
        if (s.perdida) return;
        s.perdida = true;
        clearInterval(s.timer);
        this.emitir({ tipo: 'bloqueo_perdido', idProyecto: s.idProyecto, clave: s.clave });
    }

    private async traerUltima(idProyecto: number, idRemoto: string, clave: ClaveEntidad): Promise<void> {
        const v = await this.sync.obtenerVersion(idRemoto, clave);
        if (v && !v.eliminado) await this.aplicarVersion(idProyecto, clave, v);
    }

    private async aplicarVersion(idProyecto: number, clave: ClaveEntidad, v: VersionRemota): Promise<void> {
        const m = this.manejadores[clave.entidad];
        if (!m) throw new ErrorSincronizacion('DESCONOCIDO', `No hay manejador local para "${clave.entidad}".`);
        const contenido = v.ruta ? await this.sync.descargarContenido(v.ruta) : undefined;
        await m.aplicarCambio(idProyecto, this.cambioDesde(idProyecto, clave, v), contenido);
        await this.guardarEstado(idProyecto, clave, { version: v.version, pendiente: false, conflicto: null });
    }

    private cambioDesde(idProyecto: number, clave: ClaveEntidad, v: VersionRemota): CambioPendiente {
        return {
            id: v.version, idProyecto, entidad: clave.entidad, idEntidad: 0, operacion: 'modificar',
            payload: { idGlobal: clave.idGlobal, version: v.version, datos: v.datos, ruta: v.ruta },
            fechaCambio: v.fecha, fechaEnvio: v.fecha,
        };
    }

    private async registrarConflicto(idProyecto: number, idRemoto: string, clave: ClaveEntidad): Promise<void> {
        const v = await this.sync.obtenerVersion(idRemoto, clave);
        const conflicto: ConflictoRemoto = v
            ? { version: v.version, datos: v.datos, ruta: v.ruta, autor: v.autor, fecha: v.fecha }
            : { version: 0, datos: null, ruta: null, autor: null, fecha: null };
        await this.guardarEstado(idProyecto, clave, { pendiente: true, conflicto });
    }

    private async estadoLocal(idProyecto: number, c: ClaveEntidad): Promise<EstadoLocal> {
        const f = await this.p.ejecutar(
            `SELECT version_remota, pendiente, conflicto_remoto FROM estado_entidad_remota
             WHERE id_proyecto = $1 AND entidad = $2 AND id_global = $3`, [idProyecto, c.entidad, c.idGlobal]);
        return f[0]
            ? { version: f[0].version_remota, pendiente: f[0].pendiente, conflicto: f[0].conflicto_remoto ?? null }
            : { version: 0, pendiente: false, conflicto: null };
    }

    private async guardarEstado(idProyecto: number, c: ClaveEntidad, cambios: Partial<EstadoLocal>): Promise<void> {
        const e = { ...(await this.estadoLocal(idProyecto, c)), ...cambios };
        await this.p.ejecutar(
            `INSERT INTO estado_entidad_remota (id_proyecto, entidad, id_global, version_remota, pendiente, conflicto_remoto)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id_proyecto, entidad, id_global) DO UPDATE
             SET version_remota = $4, pendiente = $5, conflicto_remoto = $6, actualizado_en = NOW()`,
            [idProyecto, c.entidad, c.idGlobal, e.version, e.pendiente, e.conflicto ? JSON.stringify(e.conflicto) : null]);
    }

    /** Lo que ya subió guardar()/subirPendientes no debe reenviarse por la cola. */
    private async descartarColaDe(idProyecto: number, c: ClaveEntidad): Promise<void> {
        await this.p.ejecutar(
            `UPDATE cola_sincronizacion SET fecha_envio = NOW()
             WHERE id_proyecto = $1 AND entidad = $2 AND operacion = 'modificar'
               AND fecha_envio IS NULL AND payload->>'idGlobal' = $3`, [idProyecto, c.entidad, c.idGlobal]);
    }
}