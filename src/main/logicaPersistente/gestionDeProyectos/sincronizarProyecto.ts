import { SincronizarProyectoDTOSchema, SincronizarProyectoDTO } from './dto';
import type { CambioPendiente } from './entidades';
import type { IPersistenciaProyectos, ISincronizador } from './interfacesSincronizacion';
import { materializarCambio } from './materializador';
import { exigirPermiso } from './permisos';
import { ErrorSincronizacion } from './erroresSincronizacion';
import { esEditable, type ResumenSubida, type EdicionCompartida } from './edicionCompartida';
import { aplicarMiembrosRemotos } from './miembrosRemotos';

// Cada cuánto se vuelven a pedir los miembros al servidor (roles cambiados desde otra compu).
const REVISAR_MIEMBROS_MS = 15_000;

export interface ResultadoSincronizacion {
    enviados: number;
    recibidos: number;
    versionServidor: number;
    ediciones: ResumenSubida; // ediciones pendientes subidas / bloqueadas / en conflicto / fallidas
}

export type AplicadorCambios = (idProyecto: number, cambio: CambioPendiente) => Promise<void>;
type Edicion = Pick<EdicionCompartida, 'aplicarCambioRemoto' | 'marcarPendiente' | 'subirPendientes'>;

const idGlobalDe = (c: CambioPendiente) => (c.payload as { idGlobal?: string } | null)?.idGlobal;

export class SincronizarProyecto {
    constructor(
        private persistencia: IPersistenciaProyectos,
        private sincronizador: ISincronizador,
        private edicion: Edicion,
        private ultimaRevisionIds = new Map<number, number>(),
        private ultimaRevisionMiembros = new Map<number, number>(),
    ) {}

    async ejecutar(entrada: SincronizarProyectoDTO): Promise<ResultadoSincronizacion> {
        const dto = SincronizarProyectoDTOSchema.parse(entrada);
        // Antes de mirar el rol: si lo cambiaron desde otra compu, acá ya se usa el nuevo.
        const miembrosCambiaron = await this.actualizarMiembros(dto.idProyecto);
        // Los lectores también sincronizan, pero solo reciben.
        const rol = await exigirPermiso(this.persistencia, dto.idProyecto, dto.idUsuario, 'proyecto.sincronizar');
        const puedeEnviar = rol !== 'lector';
        if (!this.sincronizador.estaConectado()) await this.sincronizador.conectar();

        const [proy] = await this.persistencia.ejecutar(
            `SELECT id_remoto, nombre, version_servidor FROM proyectos WHERE id_proyecto = $1`, [dto.idProyecto]);
        if (!proy) throw new Error('Proyecto inexistente');

        // Primera vez: publicar el proyecto y guardar id remoto + enlace de invitación
        let idRemoto: string | null = proy.id_remoto;
        if (!idRemoto) {
            if (rol !== 'propietario') throw new ErrorSincronizacion('SIN_PERMISO', 'Solo el propietario puede publicar el proyecto.');
            const estado = await this.sincronizador.publicarProyecto(dto.idProyecto, proy.nombre);
            idRemoto = estado.idRemoto;
            await this.persistencia.ejecutar(
                `UPDATE proyectos SET id_remoto = $1, enlace = $2 WHERE id_proyecto = $3`,
                [estado.idRemoto, estado.enlace, dto.idProyecto]);
        }

        // 1. Subir cambios locales pendientes
        let enviados = 0;
        let versionServidor = 0;
        if (puedeEnviar) {
            const pendientes = (await this.persistencia.ejecutar(
                `SELECT * FROM cola_sincronizacion
                 WHERE id_proyecto = $1 AND fecha_envio IS NULL ORDER BY id_cambio`, [dto.idProyecto]
            )).map(materializarCambio);

            const miembros = pendientes.filter(c => c.entidad === 'miembro');
            const resto = pendientes.filter(c => c.entidad !== 'miembro');
            // Editar un elemento compartido ('modificar') NO va por la cola: se sube con bloqueo y versión.
            const viaCola = resto.filter(c => !(esEditable(c.entidad) && c.operacion === 'modificar'));

            for (const c of miembros) await this.notificarMiembro(idRemoto, c);
            for (const c of resto) {
                const g = idGlobalDe(c);
                if (g && esEditable(c.entidad) && (c.operacion === 'crear' || c.operacion === 'modificar')) {
                    await this.edicion.marcarPendiente(dto.idProyecto, c.entidad, g);
                }
            }
            if (viaCola.length > 0) versionServidor = await this.sincronizador.enviarCambios(idRemoto, viaCola);
            if (pendientes.length > 0) {
                await this.persistencia.ejecutar(
                    `UPDATE cola_sincronizacion SET fecha_envio = NOW() WHERE id_cambio = ANY($1::bigint[])`,
                    [pendientes.map(c => c.id)]);
            }
            enviados = viaCola.length + miembros.length;
        }

        // 2. Bajar cambios de otros miembros y aplicarlos en orden.
        // Si uno falla, se conserva el avance hecho hasta ahí para no re-aplicar todo ni perder el orden.
        const remotos = await this.sincronizador.recibirCambios(idRemoto, proy.version_servidor);
        let ultimaAplicada: number = proy.version_servidor;
        try {
            for (const cambio of remotos.cambios) {
                await this.edicion.aplicarCambioRemoto(dto.idProyecto, cambio);
                ultimaAplicada = cambio.id;
            }
        } catch (e) {
            await this.guardarVersionServidor(dto.idProyecto, ultimaAplicada);
            throw e;
        }

        await this.completarIdsGlobales(dto.idProyecto, idRemoto);

        // 3. Subir las ediciones hechas sin conexión (con bloqueo y detección de conflictos)
        const ediciones = puedeEnviar
            ? await this.edicion.subirPendientes(dto.idProyecto)
            : { subidas: 0, bloqueadas: 0, conflictos: 0, fallidas: 0 };

        const versionFinal = Math.max(versionServidor, remotos.versionServidor);
        await this.persistencia.ejecutar(
            `UPDATE proyectos SET ultima_sincronizacion = NOW(), version_servidor = GREATEST(version_servidor, $1)
             WHERE id_proyecto = $2`, [versionFinal, dto.idProyecto]);

        // Un cambio de miembros cuenta como recibido: así la interfaz recarga roles y columnas.
        const recibidos = remotos.cambios.length + (miembrosCambiaron ? 1 : 0);
        return { enviados, recibidos, versionServidor: versionFinal, ediciones };
    }

    /**
     * Copia a proyecto_miembros los miembros y roles del servidor (la fuente de verdad).
     * Antes solo se hacía al abrir la lista de miembros, así que un rol cambiado desde otra compu
     * no llegaba a esta base y los permisos locales quedaban viejos. Si falla, no corta la sincronización.
     */
    private async actualizarMiembros(idProyecto: number): Promise<boolean> {
        const ahora = Date.now();
        if (ahora - (this.ultimaRevisionMiembros.get(idProyecto) ?? 0) < REVISAR_MIEMBROS_MS) return false;
        try {
            const [p] = await this.persistencia.ejecutar<{ id_remoto: string | null }>(
                `SELECT id_remoto FROM proyectos WHERE id_proyecto = $1`, [idProyecto]);
            if (!p?.id_remoto) return false;
            if (!this.sincronizador.estaConectado()) await this.sincronizador.conectar();
            const remotos = await this.sincronizador.listarMiembrosRemotos(p.id_remoto);
            this.ultimaRevisionMiembros.set(idProyecto, ahora);
            if (remotos.length === 0) return false; // lista vacía = respuesta rara: no se da de baja a nadie
            return await this.persistencia.transaccion(tx => aplicarMiembrosRemotos(tx, idProyecto, remotos));
        } catch (e) {
            console.warn('[sync] no se pudieron actualizar los miembros:', e);
            return false;
        }
    }

    // Altas/bajas de miembros: se reintentan desde la cola hasta que el servidor las acepta (es idempotente).
    private async notificarMiembro(idRemoto: string, c: CambioPendiente): Promise<void> {
        const p = (c.payload ?? {}) as { idUsuario?: number; rol?: 'editor' | 'lector' };
        if (typeof p.idUsuario !== 'number') return;
        if (c.operacion === 'crear') await this.sincronizador.notificarMiembro(idRemoto, p.idUsuario, 'alta', p.rol);
        else if (c.operacion === 'eliminar') await this.sincronizador.notificarMiembro(idRemoto, p.idUsuario, 'baja');
    }

    private async guardarVersionServidor(idProyecto: number, version: number): Promise<void> {
        await this.persistencia.ejecutar(
            `UPDATE proyectos SET version_servidor = GREATEST(version_servidor, $1) WHERE id_proyecto = $2`,
            [version, idProyecto]);
    }

    private async completarIdsGlobales(idProyecto: number, idRemoto: string): Promise<void> {
        const ahora = Date.now();
        if (ahora - (this.ultimaRevisionIds.get(idProyecto) ?? 0) < 60_000) return;
        const faltan = await this.persistencia.ejecutar(
            `SELECT 1 FROM proyecto_miembros
            WHERE id_proyecto = $1 AND fecha_baja IS NULL AND id_global_usuario IS NULL LIMIT 1`, [idProyecto]);
        if (faltan.length === 0) return;
        this.ultimaRevisionIds.set(idProyecto, ahora);
        try {
            for (const m of await this.sincronizador.listarMiembrosRemotos(idRemoto)) {
                if (!m.idGlobal) continue;
                await this.persistencia.ejecutar(
                    `UPDATE proyecto_miembros pm SET id_global_usuario = $3::uuid
                    FROM usuarios u
                    WHERE u.id_usuario = pm.id_usuario AND LOWER(u.email) = LOWER($2)
                    AND pm.id_proyecto = $1 AND pm.id_global_usuario IS NULL`,
                    [idProyecto, m.mail, m.idGlobal]);
            }
        } catch (e) { console.warn('[sync] no se pudieron completar los ids globales:', e); }
    }

    
}