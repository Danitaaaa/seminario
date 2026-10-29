import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BDFalsa, crearSyncFalso, type SyncFalso } from './fakes';
import { SincronizarProyecto } from '../../logicaPersistente/gestionDeProyectos/sincronizarProyecto';

let bd: BDFalsa;
let sync: SyncFalso;
let edicion: { aplicarCambioRemoto: any; marcarPendiente: any; subirPendientes: any };
let proy: { id_remoto: string | null; nombre: string; version_servidor: number };
let cola: any[];

const fila = (id: number, entidad: string, operacion: string, payload: unknown = null) => ({
    id_cambio: String(id), id_proyecto: 1, entidad, id_entidad: id, operacion, payload,
    fecha_cambio: new Date('2030-01-01'), fecha_envio: null,
});
const remoto = (id: number) => ({
    id, idProyecto: 1, entidad: 'nodo', idEntidad: 0, operacion: 'crear', payload: {},
    fechaCambio: new Date(), fechaEnvio: null,
});
const ejecutar = (rol: 'propietario' | 'editor' | 'lector' | null = 'propietario') => {
    if (rol) bd.fijarRol(1, 10, rol);
    return new SincronizarProyecto(bd, sync as any, edicion).ejecutar({ idProyecto: 1, idUsuario: 10 });
};

beforeEach(() => {
    bd = new BDFalsa();
    sync = crearSyncFalso();
    edicion = {
        aplicarCambioRemoto: vi.fn(async () => undefined),
        marcarPendiente: vi.fn(async () => undefined),
        subirPendientes: vi.fn(async () => ({ subidas: 2, bloqueadas: 0, conflictos: 1, fallidas: 0 })),
    };
    proy = { id_remoto: 'R1', nombre: 'Proy', version_servidor: 10 };
    cola = [];
    bd.sobre(/SELECT id_remoto, nombre, version_servidor FROM proyectos/, () => [proy]);
    bd.sobre(/SELECT \* FROM cola_sincronizacion/, () => cola);
});

describe('permisos y conexión', () => {
    it('rechaza a quien no es miembro', async () => {
        await expect(ejecutar(null)).rejects.toThrow('no es miembro');
    });
    it('se conecta si hace falta', async () => {
        sync.__setConectado(false);
        await ejecutar();
        expect(sync.conectar).toHaveBeenCalledTimes(1);
    });
    it('falla si el proyecto no existe', async () => {
        const vacia = new BDFalsa().fijarRol(1, 10, 'propietario')
            .sobre(/SELECT id_remoto, nombre, version_servidor FROM proyectos/, []);
        await expect(new SincronizarProyecto(vacia, sync as any, edicion).ejecutar({ idProyecto: 1, idUsuario: 10 }))
            .rejects.toThrow('Proyecto inexistente');
    });
});

describe('publicación', () => {
    beforeEach(() => { proy.id_remoto = null; });

    it('el propietario publica y guarda id remoto + enlace', async () => {
        await ejecutar('propietario');
        expect(sync.publicarProyecto).toHaveBeenCalledWith(1, 'Proy');
        const upd = bd.que(/^UPDATE proyectos SET id_remoto = \$1, enlace = \$2/)[0];
        expect(upd.valores).toEqual(['R-nuevo', 'https://enlace/x', 1]);
        expect(sync.recibirCambios).toHaveBeenCalledWith('R-nuevo', 10);
    });
    it('un editor no puede publicar', async () => {
        await expect(ejecutar('editor')).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
        expect(sync.publicarProyecto).not.toHaveBeenCalled();
    });
});

describe('subida de cambios locales', () => {
    it('sin pendientes no envía ni marca nada', async () => {
        const r = await ejecutar();
        expect(sync.enviarCambios).not.toHaveBeenCalled();
        expect(bd.que(/^UPDATE cola_sincronizacion/)).toHaveLength(0);
        expect(r.enviados).toBe(0);
    });

    describe('con una cola mixta', () => {
        beforeEach(() => {
            cola = [
                fila(1, 'nodo', 'crear', { idGlobal: 'gn' }),
                fila(2, 'evento', 'modificar', { idGlobal: 'ge' }),
                fila(3, 'evento', 'crear', { idGlobal: 'ge2' }),
                fila(4, 'miembro', 'crear', { idUsuario: 9, rol: 'editor' }),
                fila(5, 'miembro', 'eliminar', { idUsuario: 8 }),
            ];
            sync.enviarCambios.mockResolvedValue(5);
            sync.recibirCambios.mockResolvedValue({ cambios: [], versionServidor: 3 });
        });

        it('el "modificar" de un editable NO va por la cola de envío (se sube con versión y bloqueo)', async () => {
            await ejecutar();
            const [idRemoto, enviados] = sync.enviarCambios.mock.calls[0];
            expect(idRemoto).toBe('R1');
            expect(enviados.map((c: any) => c.id)).toEqual([1, 3]);
        });
        it('marca como pendientes las ediciones de elementos editables (crear y modificar)', async () => {
            await ejecutar();
            expect(edicion.marcarPendiente.mock.calls).toEqual([[1, 'evento', 'ge'], [1, 'evento', 'ge2']]);
        });
        it('notifica altas y bajas de miembros', async () => {
            await ejecutar();
            expect(sync.notificarMiembro).toHaveBeenCalledWith('R1', 9, 'alta', 'editor');
            expect(sync.notificarMiembro).toHaveBeenCalledWith('R1', 8, 'baja');
        });
        it('marca TODOS los pendientes como enviados', async () => {
            await ejecutar();
            const upd = bd.que(/^UPDATE cola_sincronizacion SET fecha_envio = NOW\(\) WHERE id_cambio/)[0];
            expect(upd.valores).toEqual([[1, 2, 3, 4, 5]]);
        });
        it('informa enviados y la versión final = máx(enviada, recibida)', async () => {
            const r = await ejecutar();
            expect(r.enviados).toBe(4); // 2 por cola + 2 de miembros
            expect(r.versionServidor).toBe(5);
            const fin = bd.que(/^UPDATE proyectos SET ultima_sincronizacion = NOW\(\)/)[0];
            expect(fin.valores).toEqual([5, 1]);
        });
    });

    it('ignora miembros sin idUsuario numérico', async () => {
        cola = [fila(1, 'miembro', 'crear', { rol: 'editor' })];
        await ejecutar();
        expect(sync.notificarMiembro).not.toHaveBeenCalled();
    });
});

describe('lectores', () => {
    it('solo reciben: no leen la cola, no envían y no suben ediciones', async () => {
        cola = [fila(1, 'nodo', 'crear', {})];
        const r = await ejecutar('lector');
        expect(bd.que(/SELECT \* FROM cola_sincronizacion/)).toHaveLength(0);
        expect(sync.enviarCambios).not.toHaveBeenCalled();
        expect(edicion.subirPendientes).not.toHaveBeenCalled();
        expect(sync.recibirCambios).toHaveBeenCalled();
        expect(r.ediciones).toEqual({ subidas: 0, bloqueadas: 0, conflictos: 0, fallidas: 0 });
    });
});

describe('bajada de cambios remotos', () => {
    it('pide desde la versión local y aplica en orden', async () => {
        sync.recibirCambios.mockResolvedValue({ cambios: [remoto(11), remoto(12)], versionServidor: 12 });
        const r = await ejecutar();
        expect(sync.recibirCambios).toHaveBeenCalledWith('R1', 10);
        expect(edicion.aplicarCambioRemoto.mock.calls.map(c => c[1].id)).toEqual([11, 12]);
        expect(r.recibidos).toBe(2);
        expect(r.versionServidor).toBe(12);
    });
    it('si uno falla, guarda el avance hasta el último aplicado y relanza', async () => {
        sync.recibirCambios.mockResolvedValue({ cambios: [remoto(11), remoto(12), remoto(13)], versionServidor: 13 });
        edicion.aplicarCambioRemoto
            .mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('falló 13'));
        await expect(ejecutar()).rejects.toThrow('falló 13');
        const parcial = bd.que(/^UPDATE proyectos SET version_servidor = GREATEST/)[0];
        expect(parcial.valores).toEqual([12, 1]);
        expect(bd.que(/^UPDATE proyectos SET ultima_sincronizacion/)).toHaveLength(0);
    });
    it('si falla el primero, el avance guardado es la versión que ya tenía', async () => {
        sync.recibirCambios.mockResolvedValue({ cambios: [remoto(11)], versionServidor: 11 });
        edicion.aplicarCambioRemoto.mockRejectedValueOnce(new Error('x'));
        await expect(ejecutar()).rejects.toThrow('x');
        expect(bd.que(/^UPDATE proyectos SET version_servidor = GREATEST/)[0].valores).toEqual([10, 1]);
    });
});

describe('ediciones sin conexión', () => {
    it('sube las pendientes DESPUÉS de bajar y devuelve el resumen', async () => {
        const orden: string[] = [];
        sync.recibirCambios.mockImplementation(async () => { orden.push('bajar'); return { cambios: [], versionServidor: 0 }; });
        edicion.subirPendientes.mockImplementation(async () => { orden.push('subir'); return { subidas: 2, bloqueadas: 0, conflictos: 1, fallidas: 0 }; });
        const r = await ejecutar();
        expect(orden).toEqual(['bajar', 'subir']);
        expect(r.ediciones).toEqual({ subidas: 2, bloqueadas: 0, conflictos: 1, fallidas: 0 });
    });
});
