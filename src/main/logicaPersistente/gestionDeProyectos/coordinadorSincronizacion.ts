import type { EventoSincronizacion, IAvisos, IPersistenciaProyectos, ISincronizador, AvisoRemoto } from './interfacesSincronizacion';
import type { SincronizarProyecto } from './sincronizarProyecto';
import { conReintentos } from './erroresSincronizacion';

interface Vigilado { idRemoto: string; baja: () => void; timer?: NodeJS.Timeout }

/**
 * Mantiene la app al día sin que el usuario toque nada:
 *  - publica los proyectos propios que todavía no tienen id_remoto;
 *  - avisos en vivo (Realtime) -> sincroniza el proyecto afectado (con debounce);
 *  - barrido periódico y reconexión automática como respaldo;
 *  - reenvía a la interfaz los eventos (cambios recibidos, bloqueos, conexión).
 */
export class CoordinadorSincronizacion {
    private vigilados = new Map<number, Vigilado>();
    private enCurso = new Set<number>();
    private repetir = new Set<number>();
    private barrido?: NodeJS.Timeout;
    private idUsuario = 0;
    private publicando = false;

    constructor(
        private p: IPersistenciaProyectos,
        private sync: ISincronizador & IAvisos,
        private sincronizar: Pick<SincronizarProyecto, 'ejecutar'>,
        private emitir: (e: EventoSincronizacion) => void,
        private opc = { debounceMs: 1500, barridoMs: 5_000 },
    ) {}

    /** Llamar al iniciar sesión. Si no hay internet no falla: el barrido reintenta. */
    async iniciar(idUsuario: number): Promise<void> {
        this.idUsuario = idUsuario;
        await this.detener();
        try {
            await conReintentos(() => this.sync.conectar());
            console.log('[sync] conectado a Supabase');
        } catch (e) {
            console.warn('[sync] conectar falló:', e);
            this.emitir({ tipo: 'conexion_perdida' });
        }
        await this.vigilarTodos().catch((e) => console.warn('[sync] vigilarTodos falló:', e));
        this.barrido = setInterval(() => void this.tick(), this.opc.barridoMs);
    }

    async detener(): Promise<void> {
        if (this.barrido) clearInterval(this.barrido);
        for (const v of this.vigilados.values()) { v.baja(); if (v.timer) clearTimeout(v.timer); }
        this.vigilados.clear();
    }

    /** Para proyectos recién publicados o a los que recién te uniste. */
    async vigilar(idProyecto: number, idRemoto: string): Promise<void> {
        if (this.vigilados.has(idProyecto)) return;
        const baja = await this.sync.suscribir(idRemoto, a => this.alAviso(idProyecto, a));
        this.vigilados.set(idProyecto, { idRemoto, baja });
    }

    /** Dejar de vigilar un proyecto (eliminado, abandonado o sin acceso): cancela el aviso en vivo y los pendientes. */
    async dejarDeVigilar(idProyecto: number): Promise<void> {
        const v = this.vigilados.get(idProyecto);
        if (!v) return;
        try { v.baja(); } catch { /* ya estaba desuscripto */ }
        if (v.timer) clearTimeout(v.timer);
        this.vigilados.delete(idProyecto);
        this.repetir.delete(idProyecto);
    }

    /**
     * Llamar después de confirmar un cambio local (fuera de la transacción).
     * Usa el mismo debounce que los avisos en vivo, así que varias llamadas seguidas hacen una sola sincronización.
     */
    solicitarSincronizacion(idProyecto: number): void {
        if (!this.sync.estaConectado()) return; // el barrido lo recoge cuando vuelva la red
        this.programar(idProyecto);
    }

    /**
     * Publica en el servidor los proyectos propios que todavía no tienen id_remoto.
     * Sin esto nadie los publicaba: este coordinador solo vigila los que ya están publicados.
     * `publicando` evita que el barrido solape una publicación que todavía está en curso.
     */
    private async publicarPendientes(): Promise<void> {
        if (this.publicando) return;
        this.publicando = true;
        try {
            const filas = await this.p.ejecutar(
                `SELECT p.id_proyecto FROM proyectos p
                 JOIN proyecto_miembros m ON m.id_proyecto = p.id_proyecto
                 WHERE m.id_usuario = $1 AND m.rol = 'propietario' AND m.fecha_baja IS NULL AND p.id_remoto IS NULL`,
                [this.idUsuario]);
            // El barrido corre cada 5 segundos: solo se avisa cuando hay algo para publicar.
            if (filas.length > 0) console.log('[sync] proyectos a publicar:', filas.length);
            for (const f of filas) {
                try {
                    await this.sincronizar.ejecutar({ idProyecto: f.id_proyecto, idUsuario: this.idUsuario });
                    console.log('[sync] publicado proyecto', f.id_proyecto);
                } catch (e) {
                    console.warn('[sync] error publicando proyecto', f.id_proyecto, e);
                    this.emitir({ tipo: 'error_sync', idProyecto: f.id_proyecto, mensaje: e instanceof Error ? e.message : String(e) });
                }
            }
        } finally {
            this.publicando = false;
        }
    }

    private async vigilarTodos(): Promise<void> {
        if (!this.sync.estaConectado()) { console.log('[sync] sin conexión: no se vigila ni se publica'); return; }
        await this.publicarPendientes();
        const filas = await this.p.ejecutar(
            `SELECT p.id_proyecto, p.id_remoto FROM proyectos p
             JOIN proyecto_miembros m ON m.id_proyecto = p.id_proyecto
             WHERE m.id_usuario = $1 AND m.fecha_baja IS NULL AND p.id_remoto IS NOT NULL`, [this.idUsuario]);
        for (const f of filas) await this.vigilar(f.id_proyecto, f.id_remoto).catch(console.warn);
    }

    /** Suelta los proyectos en los que el usuario ya no es miembro activo (eliminados, abandonados o quitado). */
    private async soltarNoVigentes(): Promise<void> {
        const filas = await this.p.ejecutar<{ id_proyecto: number }>(
            `SELECT p.id_proyecto FROM proyectos p
             JOIN proyecto_miembros m ON m.id_proyecto = p.id_proyecto
             WHERE m.id_usuario = $1 AND m.fecha_baja IS NULL AND p.id_remoto IS NOT NULL`,
            [this.idUsuario]);
        const vigentes = new Set(filas.map(f => f.id_proyecto));
        for (const id of [...this.vigilados.keys()]) {
            if (!vigentes.has(id)) await this.dejarDeVigilar(id);
        }
    }

    private alAviso(idProyecto: number, a: AvisoRemoto): void {
        if (a.tipo === 'cambios') this.programar(idProyecto);
        else if (a.tipo === 'bloqueo') {
            this.emitir({
                tipo: 'bloqueo_cambio', idProyecto, clave: a.clave,
                titular: a.titular && { nombre: a.titular.nombre, mail: a.titular.mail },
            });
        } else if (a.tipo === 'estado') {
            this.emitir({ tipo: a.conectado ? 'conexion_recuperada' : 'conexion_perdida' });
            if (a.conectado) this.programar(idProyecto);
        }
    }

    private programar(idProyecto: number): void {
        const v = this.vigilados.get(idProyecto);
        if (!v) return;
        if (v.timer) clearTimeout(v.timer);
        v.timer = setTimeout(() => void this.sincronizarUno(idProyecto), this.opc.debounceMs);
    }

    private async tick(): Promise<void> {
        if (!this.sync.estaConectado()) {
            try { await this.sync.conectar(); this.emitir({ tipo: 'conexion_recuperada' }); }
            catch { return; } // sigue sin red: reintenta en el próximo barrido
        }
        // Publica los proyectos nuevos y empieza a vigilar los que faltan (los ya vigilados se omiten).
        await this.vigilarTodos().catch((e) => console.warn('[sync] vigilarTodos falló:', e));
        await this.soltarNoVigentes().catch((e) => console.warn('[sync] soltarNoVigentes falló:', e));
        for (const id of [...this.vigilados.keys()]) await this.sincronizarUno(id);
    }

    private async sincronizarUno(idProyecto: number): Promise<void> {
        if (!this.vigilados.has(idProyecto)) return; // lo soltaron mientras había un temporizador pendiente
        if (this.enCurso.has(idProyecto)) { this.repetir.add(idProyecto); return; } // evita sincronizaciones solapadas
        this.enCurso.add(idProyecto);
        try {
            const r = await this.sincronizar.ejecutar({ idProyecto, idUsuario: this.idUsuario });
            if (r.recibidos > 0) this.emitir({ tipo: 'cambios_recibidos', idProyecto, cantidad: r.recibidos });
        } catch (e) {
            console.warn('[sync] error sincronizando proyecto', idProyecto, e);
            this.emitir({ tipo: 'error_sync', idProyecto, mensaje: e instanceof Error ? e.message : String(e) });
        } finally {
            this.enCurso.delete(idProyecto);
            if (this.repetir.delete(idProyecto)) this.programar(idProyecto);
        }
    }
}