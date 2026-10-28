import { randomUUID } from 'node:crypto';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { CambioPendiente, RolMiembro } from './entidades';
import type {
    AvisoRemoto, MiembroRemoto, CambiosRemotos, ClaveEntidad, EstadoBloqueo, EstadoRemoto, IAvisos, IBloqueador,
    ISincronizador, VersionRemota,
} from './interfacesSincronizacion';
import {
    ErrorArchivoGrande, ErrorSesionExpirada, ErrorSincronizacion, ErrorSinConexion,
    conReintentos, traducirErrorSupabase,
} from './erroresSincronizacion';

/** La app aporta quién es el usuario; el adaptador no conoce tu login local. */
export interface ProveedorIdentidad {
    credenciales(): Promise<{ mail: string; password: string; nombre: string }>;
    /** Se llama cuando el servidor aceptó las credenciales: recién ahí conviene persistirlas. */
    confirmar?(mail: string): void;
}
export type ResolvedorMail = (idUsuario: number) => Promise<string>;

export interface ConfigSupabase {
    url: string;
    anonKey: string;         // la "anon/publishable key": es pública por diseño. NUNCA la service_role.
    idCliente: string;       // identifica esta instalación (se persiste en userData)
    bucket?: string;
    esquemaEnlace?: string;  // prefijo del enlace de invitación
    maxBytesArchivo?: number;
    ttlBloqueoSeg?: number;
}

const MB = 1024 * 1024;
const LOTE_CAMBIOS = 200;
const MAX_CAMBIOS_POR_LECTURA = 1000;
const fecha = (v: unknown): Date | null => (v ? new Date(v as string) : null);

/** Único archivo que conoce a Supabase. Para cambiar de proveedor se escribe otro adaptador. */
export class SincronizadorSupabase implements ISincronizador, IBloqueador, IAvisos {
    private readonly db: SupabaseClient;
    private readonly bucket: string;
    private readonly esquema: string;
    private readonly maxBytes: number;
    private readonly ttl: number;
    private conectado = false;
    private perfil: { mail: string; nombre: string } | null = null;
    private readonly escuchas = new Set<(a: AvisoRemoto) => void>();
    private readonly canales = new Set<RealtimeChannel>();

    constructor(
        private readonly cfg: ConfigSupabase,
        private readonly identidad: ProveedorIdentidad,
        private readonly mailDe: ResolvedorMail,
    ) {
        this.bucket = cfg.bucket ?? 'archivos';
        this.esquema = cfg.esquemaEnlace ?? 'proyecto-sync://unirse/';
        this.maxBytes = cfg.maxBytesArchivo ?? 50 * MB;
        this.ttl = cfg.ttlBloqueoSeg ?? 120;
        this.db = createClient(cfg.url, cfg.anonKey, {
            auth: { persistSession: false, autoRefreshToken: true },
            realtime: { transport: WebSocket as never }, // Node < 22 no trae WebSocket nativo
        });
    }

    /* ---------------- Conexión ---------------- */

    estaConectado(): boolean { return this.conectado; }

    async conectar(): Promise<void> {
        const { mail, password, nombre } = await this.identidad.credenciales();
        const email = mail.trim().toLowerCase();
        const ingreso = await this.intentar(() => this.db.auth.signInWithPassword({ email, password }));
        if (ingreso.error) {
            if (!/invalid login credentials/i.test(ingreso.error.message)) throw traducirErrorSupabase(ingreso.error);
            // Primera vez en este servidor: se crea la cuenta de sincronización.
            const alta = await this.intentar(() => this.db.auth.signUp({ email, password, options: { data: { nombre } } }));
            if (alta.error) throw new ErrorSesionExpirada('Credenciales de sincronización incorrectas.');
            if (!alta.data.session) {
                throw new ErrorSesionExpirada('Cuenta creada sin sesión: en Supabase desactivá "Confirm email" (Authentication > Providers > Email) o confirmá el mail.');
            }
        }
        this.perfil = { mail: email, nombre };
        this.conectado = true;
        try { 
            this.identidad.confirmar?.(email); 
        } catch (e) { 
            console.warn('[sync] no se pudo guardar la credencial:', e); 
        }
        this.emitir({ tipo: 'estado', conectado: true });
    }

    async desconectar(): Promise<void> {
        for (const c of this.canales) await this.db.removeChannel(c);
        this.canales.clear();
        await this.db.auth.signOut().catch(() => undefined);
        this.marcarCaida();
    }

    /* ---------------- ISincronizador ---------------- */

    async publicarProyecto(_idProyectoLocal: number, nombre: string): Promise<EstadoRemoto> {
        const r = await this.rpc<{ id: string; token: string; version: number }>('publicar_proyecto', { p_nombre: nombre }, 1);
        return { idRemoto: r.id, enlace: `${this.esquema}${r.token}`, version: Number(r.version) };
    }

    async resolverEnlace(enlace: string) {
        const token = enlace.startsWith(this.esquema) ? enlace.slice(this.esquema.length).replace(/\/+$/, '') : '';
        if (!token) throw new ErrorSincronizacion('INVITACION_INVALIDA', 'El enlace de invitación es inválido.');
        const r = await this.rpc<{ id: string; nombre: string; rol: RolMiembro }>('resolver_invitacion', { p_token: token });
        return { idRemoto: r.id, nombre: r.nombre, numeroProyecto: r.id.slice(0, 8), rol: r.rol };
    }

    async enviarCambios(idRemoto: string, cambios: CambioPendiente[]): Promise<number> {
        // Eliminar el proyecto: primero sus archivos en Storage (las políticas exigen ser miembro) y después
        // el proyecto, que borra la función enviar_cambios del servidor.
        if (cambios.some(c => c.entidad === 'proyecto' && c.operacion === 'eliminar')) {
            if (cambios.length > 1) throw new Error('La eliminación del proyecto se envía sola.');
            this.exigirConexion();
            try { await this.borrarArchivosRemotos(idRemoto); } catch (e) { this.alFallar(e); throw e; }
        }
        let version = 0;
        for (let i = 0; i < cambios.length; i += LOTE_CAMBIOS) {
            const lote = cambios.slice(i, i + LOTE_CAMBIOS).map(c => ({
                uid: `${this.cfg.idCliente}:${c.id}`, // el servidor descarta uids repetidos: reintentar es seguro
                entidad: c.entidad, idEntidad: c.idEntidad, operacion: c.operacion, payload: c.payload ?? null,
            }));
            version = Number(await this.rpc<number | string>('enviar_cambios',
                { p_id: idRemoto, p_origen: this.cfg.idCliente, p_cambios: lote }));
        }
        return version;
    }

    async recibirCambios(idRemoto: string, desdeVersion: number): Promise<CambiosRemotos> {
        const proy = await this.consulta<{ version: number }>(() =>
            this.db.from('proyectos_remotos').select('version').eq('id', idRemoto).single() as never);
        const hasta = Number(proy?.version ?? desdeVersion);
        if (hasta <= desdeVersion) return { cambios: [], versionServidor: hasta };

        const filas = (await this.consulta<any[]>(() =>
            this.db.from('cambios_remotos').select('*').eq('id_remoto', idRemoto)
                .gt('version', desdeVersion).lte('version', hasta)
                .order('version').limit(MAX_CAMBIOS_POR_LECTURA) as never)) ?? [];
        // Si hay más de un lote, el próximo sincronizar continúa desde donde quedó este.
        const truncado = filas.length === MAX_CAMBIOS_POR_LECTURA;
        const versionServidor = truncado ? Number(filas[filas.length - 1].version) : hasta;
        const cambios = filas.filter(f => f.origen !== this.cfg.idCliente).map(f => this.aCambio(f));
        return { cambios, versionServidor };
    }

    // Variante por id numérico local (compatibilidad con la interfaz original).
    async subirArchivo(idRemoto: string, idArchivo: number, contenido: Uint8Array): Promise<void> {
        await this.subirObjeto(`${idRemoto}/legacy/${idArchivo}`, contenido, true);
    }
    async descargarArchivo(idRemoto: string, idArchivo: number): Promise<Uint8Array> {
        return this.descargarContenido(`${idRemoto}/legacy/${idArchivo}`);
    }

    async notificarMiembro(idRemoto: string, idUsuario: number, accion: 'alta' | 'baja', rol?: RolMiembro): Promise<void> {
        await this.gestionarMiembroPorMail(idRemoto, await this.mailDe(idUsuario), accion, rol);
    }

    async listarMiembrosRemotos(idRemoto: string): Promise<MiembroRemoto[]> {
        const datos = await this.rpc<any[]>('listar_miembros', { p_id: idRemoto });
        return (datos ?? []).map((m: any): MiembroRemoto => ({
            mail: String(m.mail).toLowerCase(),
            rol: m.rol,
            activo: !!m.activo,
            pendiente: !!m.pendiente,
            fechaUnion: fecha(m.fechaUnion ?? m.unido_en),
            fechaBaja: fecha(m.fechaBaja ?? m.baja_en),
        }));
    }

    async gestionarMiembroPorMail(idRemoto: string, mail: string, accion: 'alta' | 'baja', rol?: RolMiembro): Promise<void> {
        await this.rpc('gestionar_miembro', { p_id: idRemoto, p_mail: mail, p_accion: accion, p_rol: rol ?? 'editor' });
    }

    /* ---------------- IBloqueador ---------------- */

    async adquirirBloqueo(idRemoto: string, clave: ClaveEntidad): Promise<EstadoBloqueo> {
        const f = await this.rpc<any>('adquirir_bloqueo', {
            p_id: idRemoto, p_entidad: clave.entidad, p_id_global: clave.idGlobal,
            p_cliente: this.cfg.idCliente, p_nombre: this.perfil?.nombre ?? this.perfil?.mail ?? 'Alguien', p_ttl: this.ttl,
        });
        return this.aEstado(f);
    }

    async renovarBloqueo(idRemoto: string, clave: ClaveEntidad): Promise<boolean> {
        return Boolean(await this.rpc<boolean>('renovar_bloqueo', {
            p_id: idRemoto, p_entidad: clave.entidad, p_id_global: clave.idGlobal, p_cliente: this.cfg.idCliente, p_ttl: this.ttl,
        }));
    }

    async liberarBloqueo(idRemoto: string, clave: ClaveEntidad): Promise<void> {
        await this.rpc('liberar_bloqueo', {
            p_id: idRemoto, p_entidad: clave.entidad, p_id_global: clave.idGlobal, p_cliente: this.cfg.idCliente,
        });
    }

    async consultarBloqueo(idRemoto: string, clave: ClaveEntidad): Promise<EstadoBloqueo> {
        return this.aEstado(await this.rpc<any>('estado_bloqueo', {
            p_id: idRemoto, p_entidad: clave.entidad, p_id_global: clave.idGlobal,
        }));
    }

    async guardarVersion(idRemoto: string, clave: ClaveEntidad, versionBase: number, datos: unknown, contenido?: Uint8Array): Promise<VersionRemota> {
        if (contenido && contenido.byteLength > this.maxBytes) throw new ErrorArchivoGrande(this.maxBytes);
        let ruta: string | null = null;
        if (contenido) {
            // Objeto inmutable con nonce: un cliente desactualizado jamás pisa una versión ya confirmada.
            ruta = `${idRemoto}/${clave.entidad}/${clave.idGlobal}/v${versionBase + 1}-${randomUUID()}`;
            await this.subirObjeto(ruta, contenido, false);
        }
        try {
            // Sin reintentos automáticos: tras un corte, repetir daría un falso "versión desactualizada".
            const r = await this.rpc<{ version: number; actualizado_en: string; autor: string }>('guardar_entidad', {
                p_id: idRemoto, p_entidad: clave.entidad, p_id_global: clave.idGlobal,
                p_version_base: versionBase, p_datos: datos ?? null, p_ruta: ruta, p_origen: this.cfg.idCliente,
            }, 1);
            return { version: Number(r.version), datos, ruta, autor: r.autor, fecha: new Date(r.actualizado_en), eliminado: false };
        } catch (e) {
            if (ruta) await this.db.storage.from(this.bucket).remove([ruta]).catch(() => undefined); // best-effort
            throw e;
        }
    }

    async obtenerVersion(idRemoto: string, clave: ClaveEntidad): Promise<VersionRemota | null> {
        const f = await this.consulta<any>(() =>
            this.db.from('entidades_remotas').select('*').eq('id_remoto', idRemoto)
                .eq('entidad', clave.entidad).eq('id_global', clave.idGlobal).maybeSingle() as never);
        return f ? {
            version: Number(f.version), datos: f.datos, ruta: f.ruta ?? null,
            autor: f.actualizado_por ?? '', fecha: new Date(f.actualizado_en), eliminado: !!f.eliminado,
        } : null;
    }

    async descargarContenido(ruta: string): Promise<Uint8Array> {
        this.exigirConexion();
        const blob = await conReintentos(async () => {
            const { data, error } = await this.intentar(() => this.db.storage.from(this.bucket).download(ruta));
            if (error || !data) throw traducirErrorSupabase(error ?? new Error('Archivo remoto inexistente'));
            return data;
        }).catch(e => { this.alFallar(e); throw e; });
        return new Uint8Array(await blob.arrayBuffer());
    }

    /* ---------------- IAvisos (Realtime) ---------------- */

    async suscribir(idRemoto: string, escucha: (aviso: AvisoRemoto) => void): Promise<() => void> {
        this.escuchas.add(escucha);
        const canal = this.db.channel(`proyecto:${idRemoto}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'cambios_remotos', filter: `id_remoto=eq.${idRemoto}` },
                (p: any) => { if (p.new.origen !== this.cfg.idCliente) escucha({ tipo: 'cambios', version: Number(p.new.version) }); })
            // Sin filtro: los DELETE no se pueden filtrar. Se descarta por id_remoto acá (RLS ya limita a mis proyectos).
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bloqueos' }, (p: any) => {
                const f = p.eventType === 'DELETE' ? p.old : p.new;
                if (!f || f.id_remoto !== idRemoto) return;
                const clave: ClaveEntidad = { entidad: f.entidad, idGlobal: f.id_global };
                escucha({
                    tipo: 'bloqueo', clave,
                    titular: p.eventType === 'DELETE' ? null : { mail: f.mail, nombre: f.nombre, idCliente: f.id_cliente },
                });
            })
            .subscribe(estado => {
                if (estado === 'SUBSCRIBED') escucha({ tipo: 'estado', conectado: true });
                else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') escucha({ tipo: 'estado', conectado: false });
            });
        this.canales.add(canal);
        return () => {
            this.escuchas.delete(escucha);
            this.canales.delete(canal);
            void this.db.removeChannel(canal);
        };
    }

    /* ---------------- Internos ---------------- */

    /** Borra todos los objetos del proyecto en Storage (el SQL no puede: Supabase bloquea el borrado directo). */
    private async borrarArchivosRemotos(idRemoto: string): Promise<void> {
        const bucket = this.db.storage.from(this.bucket);
        const PAGINA = 100;
        const carpetas: string[] = [idRemoto];
        const rutas: string[] = [];

        while (carpetas.length > 0) {
            const carpeta = carpetas.pop()!;
            for (let desde = 0; ; desde += PAGINA) {
                const { data, error } = await this.intentar(() => bucket.list(carpeta, { limit: PAGINA, offset: desde }));
                if (error) throw traducirErrorSupabase(error);
                if (!data || data.length === 0) break;
                for (const e of data) {
                    const ruta = `${carpeta}/${e.name}`;
                    if (e.id === null) carpetas.push(ruta); // las subcarpetas vienen con id null
                    else rutas.push(ruta);
                }
                if (data.length < PAGINA) break;
            }
        }
        for (let i = 0; i < rutas.length; i += PAGINA) {
            const { error } = await this.intentar(() => bucket.remove(rutas.slice(i, i + PAGINA)));
            if (error) throw traducirErrorSupabase(error);
        }
    }

    private exigirConexion(): void { if (!this.conectado) throw new ErrorSinConexion(); }

    private marcarCaida(): void {
        if (!this.conectado) return;
        this.conectado = false;
        this.emitir({ tipo: 'estado', conectado: false });
    }

    private alFallar(e: unknown): void { if (e instanceof ErrorSinConexion) this.marcarCaida(); }

    private emitir(a: AvisoRemoto): void { for (const e of this.escuchas) e(a); }

    private async intentar<T>(f: () => PromiseLike<T>): Promise<T> {
        try { return await f(); } catch (e) { throw traducirErrorSupabase(e); }
    }

    /** Ejecuta una consulta de Supabase con traducción de errores y reintentos ante fallas de red. */
    private async consulta<T>(op: () => PromiseLike<{ data: T | null; error: unknown }>, intentos = 3): Promise<T | null> {
        this.exigirConexion();
        try {
            return await conReintentos(async () => {
                const r = await this.intentar(op);
                if (r.error) throw traducirErrorSupabase(r.error);
                return r.data;
            }, intentos);
        } catch (e) { this.alFallar(e); throw e; }
    }

    private async rpc<T = unknown>(nombre: string, args: Record<string, unknown>, intentos = 3): Promise<T> {
        return (await this.consulta<T>(() => this.db.rpc(nombre, args) as never, intentos)) as T;
    }

    private async subirObjeto(ruta: string, contenido: Uint8Array, sobrescribir: boolean): Promise<void> {
        this.exigirConexion();
        if (contenido.byteLength > this.maxBytes) throw new ErrorArchivoGrande(this.maxBytes);
        try {
            await conReintentos(async () => {
                const { error } = await this.intentar(() => this.db.storage.from(this.bucket)
                    .upload(ruta, contenido, { upsert: sobrescribir, contentType: 'application/octet-stream' }));
                if (error && !/already exists|duplicate/i.test(error.message)) throw traducirErrorSupabase(error);
            });
        } catch (e) { this.alFallar(e); throw e; }
    }

    private aEstado(f: any): EstadoBloqueo {
        return {
            concedido: !!f.concedido,
            titular: f.mail ? { mail: f.mail, nombre: f.nombre, idCliente: f.id_cliente } : null,
            desde: fecha(f.desde), venceEn: fecha(f.vence_en),
            version: Number(f.version ?? 0),
            ultimaModificacion: fecha(f.ultima_modificacion), ultimoAutor: f.ultimo_autor ?? null,
            eliminado: !!f.eliminado,
        };
    }

    private aCambio(f: any): CambioPendiente {
        return {
            id: Number(f.version), // el id de un cambio remoto ES su versión en el servidor
            idProyecto: 0,         // lo completa quien aplica (el id local del proyecto)
            entidad: f.entidad, idEntidad: Number(f.id_entidad ?? 0), operacion: f.operacion,
            payload: f.payload, fechaCambio: new Date(f.fecha_cambio), fechaEnvio: new Date(f.fecha_cambio),
        };
    }
}