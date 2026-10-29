import { vi } from 'vitest';
import type { EstadoBloqueo, IPersistenciaProyectos, VersionRemota } from '../../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';
import type { RolMiembro } from '../../logicaPersistente/gestionDeProyectos/entidades';

type Handler = (valores: unknown[], sql: string) => unknown[] | Promise<unknown[]>;

export const UUID = '11111111-1111-4111-8111-111111111111';

/**
 * Persistencia en memoria. Registra cada consulta (con el SQL normalizado en una línea) y entiende
 * las consultas de permisos, id_remoto y estado_entidad_remota. Cualquier otra devuelve [] salvo que
 * el test registre una respuesta con `sobre(regex, filas | función)` (las registradas tienen prioridad).
 */
export class BDFalsa implements IPersistenciaProyectos {
    consultas: { sql: string; valores: unknown[] }[] = [];
    proyectos = new Map<number, { id_remoto: string | null }>();
    roles = new Map<string, RolMiembro>();
    estados = new Map<string, { version_remota: number; pendiente: boolean; conflicto_remoto: any }>();
    private overrides: [RegExp, Handler][] = [];

    sobre(re: RegExp, respuesta: unknown[] | Handler): this {
        this.overrides.push([re, Array.isArray(respuesta) ? () => respuesta : respuesta]);
        return this;
    }
    fijarRol(idProyecto: number, idUsuario: number, rol: RolMiembro): this {
        this.roles.set(`${idProyecto}:${idUsuario}`, rol); return this;
    }
    publicar(idProyecto: number, idRemoto: string | null = 'R1'): this {
        this.proyectos.set(idProyecto, { id_remoto: idRemoto }); return this;
    }
    fijarEstado(idProyecto: number, entidad: string, idGlobal: string,
                e: Partial<{ version: number; pendiente: boolean; conflicto: any }>): this {
        this.estados.set(`${idProyecto}:${entidad}:${idGlobal}`, {
            version_remota: e.version ?? 0, pendiente: e.pendiente ?? false, conflicto_remoto: e.conflicto ?? null,
        });
        return this;
    }
    estado(idProyecto: number, entidad: string, idGlobal: string) {
        const e = this.estados.get(`${idProyecto}:${entidad}:${idGlobal}`);
        return e && { version: e.version_remota, pendiente: e.pendiente, conflicto: e.conflicto_remoto };
    }
    /** Consultas ejecutadas cuyo SQL coincide con la expresión. */
    que(re: RegExp) { return this.consultas.filter(c => re.test(c.sql)); }

    async transaccion<T>(trabajo: (tx: IPersistenciaProyectos) => Promise<T>): Promise<T> { return trabajo(this); }

    async ejecutar<T extends Record<string, any> = any>(sqlCrudo: string, valores: unknown[] = []): Promise<T[]> {
        const sql = sqlCrudo.replace(/\s+/g, ' ').trim();
        this.consultas.push({ sql, valores });
        for (const [re, h] of this.overrides) if (re.test(sql)) return (await h(valores, sql)) as T[];
        return this.incorporado(sql, valores) as T[];
    }

    private incorporado(sql: string, v: unknown[]): unknown[] {
        if (sql.startsWith('SELECT rol FROM proyecto_miembros WHERE id_proyecto = $1 AND id_usuario = $2')) {
            const rol = this.roles.get(`${v[0]}:${v[1]}`);
            return rol ? [{ rol }] : [];
        }
        if (sql === 'SELECT id_remoto FROM proyectos WHERE id_proyecto = $1') {
            const p = this.proyectos.get(Number(v[0]));
            return p ? [{ id_remoto: p.id_remoto }] : [];
        }
        if (sql.startsWith('SELECT version_remota, pendiente, conflicto_remoto FROM estado_entidad_remota')) {
            const e = this.estados.get(`${v[0]}:${v[1]}:${v[2]}`);
            return e ? [{ ...e }] : [];
        }
        if (sql.startsWith('INSERT INTO estado_entidad_remota')) {
            const [p, ent, g, ver, pend, conf] = v as [number, string, string, number, boolean, string | null];
            this.estados.set(`${p}:${ent}:${g}`, {
                version_remota: ver, pendiente: pend, conflicto_remoto: conf ? JSON.parse(conf) : null,
            });
            return [];
        }
        if (sql.startsWith('SELECT entidad, id_global, version_remota FROM estado_entidad_remota')) {
            return [...this.estados.entries()]
                .filter(([k, e]) => k.startsWith(`${v[0]}:`) && e.pendiente && !e.conflicto_remoto)
                .map(([k, e]) => { const [, entidad, id_global] = k.split(':'); return { entidad, id_global, version_remota: e.version_remota }; });
        }
        if (sql.startsWith('SELECT entidad, id_global FROM estado_entidad_remota')) {
            return [...this.estados.entries()]
                .filter(([k, e]) => k.startsWith(`${v[0]}:`) && e.conflicto_remoto)
                .map(([k]) => { const [, entidad, id_global] = k.split(':'); return { entidad, id_global }; });
        }
        return [];
    }
}

export const estadoBloqueo = (o: Partial<EstadoBloqueo> = {}): EstadoBloqueo => ({
    concedido: true, titular: null, desde: null, venceEn: new Date('2030-01-01T00:00:00Z'),
    version: 0, ultimaModificacion: null, ultimoAutor: null, eliminado: false, ...o,
});

export const versionRemota = (o: Partial<VersionRemota> = {}): VersionRemota => ({
    version: 1, datos: { titulo: 'remoto' }, ruta: null, autor: 'otro@x.com',
    fecha: new Date('2030-01-01T00:00:00Z'), eliminado: false, ...o,
});

/** Servidor falso que implementa ISincronizador + IBloqueador + IAvisos. */
export function crearSyncFalso() {
    let conectado = true;
    const s = {
        estaConectado: vi.fn(() => conectado),
        conectar: vi.fn(async () => { conectado = true; }),
        desconectar: vi.fn(async () => { conectado = false; }),
        publicarProyecto: vi.fn(async (_id: number, _n: string) => ({ idRemoto: 'R-nuevo', enlace: 'https://enlace/x', version: 0 })),
        resolverEnlace: vi.fn(async (_e: string): Promise<any> => ({ idRemoto: 'R1', nombre: 'Proy', numeroProyecto: '1', rol: 'editor' })),
        enviarCambios: vi.fn(async (_r: string, _c: any[]) => 1),
        recibirCambios: vi.fn(async (_r: string, _v: number): Promise<any> => ({ cambios: [], versionServidor: 0 })),
        subirArchivo: vi.fn(async () => undefined),
        descargarArchivo: vi.fn(async () => new Uint8Array()),
        notificarMiembro: vi.fn(async (..._a: any[]) => undefined),
        listarMiembrosRemotos: vi.fn(async (_r: string): Promise<any[]> => []),
        gestionarMiembroPorMail: vi.fn(async (..._a: any[]) => undefined),
        adquirirBloqueo: vi.fn(async (..._a: any[]) => estadoBloqueo()),
        renovarBloqueo: vi.fn(async (..._a: any[]) => true),
        liberarBloqueo: vi.fn(async (..._a: any[]) => undefined),
        consultarBloqueo: vi.fn(async (..._a: any[]) => estadoBloqueo()),
        guardarVersion: vi.fn(async (_r: string, _c: any, base: number, _d: unknown, _b?: Uint8Array) => versionRemota({ version: base + 1 })),
        obtenerVersion: vi.fn(async (..._a: any[]): Promise<any> => null),
        descargarContenido: vi.fn(async (_ruta: string) => new Uint8Array([1, 2, 3])),
        suscribir: vi.fn(async (_r: string, _e: (a: any) => void) => () => undefined),
        __setConectado: (v: boolean) => { conectado = v; },
    };
    return s;
}
export type SyncFalso = ReturnType<typeof crearSyncFalso>;
