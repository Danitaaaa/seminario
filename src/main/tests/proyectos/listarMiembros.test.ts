import { beforeEach, describe, expect, it } from 'vitest';
import { BDFalsa, crearSyncFalso, type SyncFalso } from './fakes';
import { ListarMiembros } from '../../logicaPersistente/gestionDeProyectos/listarMiembros';
import { ListarProyectos } from '../../logicaPersistente/gestionDeProyectos/listarProyectos';

const remoto = (mail: string, rol: 'propietario' | 'editor' | 'lector', o: object = {}) =>
    ({ mail, rol, activo: true, pendiente: false, fechaUnion: new Date('2030-01-01'), fechaBaja: null, ...o });

let bd: BDFalsa;
let sync: SyncFalso;

const listar = (idSolicitante: number, soloActivos?: boolean) =>
    new ListarMiembros(bd, sync as any).ejecutar({ idProyecto: 1, idUsuarioSolicitante: idSolicitante, soloActivos } as any);

beforeEach(() => {
    bd = new BDFalsa().publicar(1, 'R1')
        .fijarRol(1, 10, 'propietario').fijarRol(1, 11, 'editor').fijarRol(1, 12, 'lector');
    bd.sobre(/FROM usuarios u LEFT JOIN LATERAL/, []);
    sync = crearSyncFalso();
    sync.listarMiembrosRemotos.mockResolvedValue([
        remoto('prop@x.com', 'propietario'),
        remoto('ana@x.com', 'editor'),
        remoto('pen@x.com', 'lector', { pendiente: true }),
        remoto('baja@x.com', 'lector', { activo: false, fechaBaja: new Date('2030-02-01') }),
    ]);
});

describe('consultar miembros (caso 23, 24)', () => {
    it.each([10, 11, 12])('el usuario %s (propietario, editor, lector) ve la lista', async (id) => {
        const l = await listar(id);
        expect(l.map(m => m.mail)).toEqual(['prop@x.com', 'ana@x.com', 'pen@x.com']);
    });
    it('cada miembro trae nombre, mail, rol y estado', async () => {
        const [prop] = await listar(10);
        expect(prop).toMatchObject({ mail: 'prop@x.com', rol: 'propietario', activo: true, pendiente: false });
        expect(prop.nombre).toBe('prop');
    });
    it('soloActivos=false incluye los dados de baja', async () => {
        const l = await listar(10, false);
        expect(l.map(m => m.mail)).toContain('baja@x.com');
    });
    it('quien no es miembro no puede consultar', async () => {
        await expect(listar(99)).rejects.toThrow('no es miembro');
    });
    it('un pendiente se distingue por el flag "pendiente" (el contador debe excluirlo, caso 24)', async () => {
        const l = await listar(10);
        const efectivos = l.filter(m => m.activo && !m.pendiente);
        expect(efectivos).toHaveLength(2);
        expect(l.find(m => m.mail === 'pen@x.com')).toMatchObject({ activo: true, pendiente: true });
    });
    it('si el servidor falla, muestra la lista local', async () => {
        sync.listarMiembrosRemotos.mockRejectedValue(new Error('sin red'));
        bd.sobre(/SELECT pm\.\*/, [{
            id_proyecto_miembro: 1, id_usuario: 10, rol: 'propietario', fecha_baja: null,
            nombre_usuario: 'Ana', email: 'ANA@x.com', fecha_union: null,
        }]);
        const l = await listar(10);
        expect(l).toHaveLength(1);
        expect(l[0]).toMatchObject({ mail: 'ana@x.com', nombre: 'Ana', activo: true });
    });
    it('proyecto sin publicar: usa la lista local sin llamar al servidor', async () => {
        bd.publicar(1, null);
        bd.sobre(/SELECT pm\.\*/, []);
        await listar(10);
        expect(sync.listarMiembrosRemotos).not.toHaveBeenCalled();
    });
    it('la consulta local filtra bajas cuando soloActivos', async () => {
        bd.publicar(1, null);
        await listar(10, true);
        expect(bd.que(/SELECT pm\.\*/)[0].sql).toContain('pm.fecha_baja IS NULL');
    });
});

describe('listar y buscar proyectos (caso 13)', () => {
    const listarP = (o: object = {}) => new ListarProyectos(bd).ejecutar({ idUsuario: 10, ...o } as any);
    const sql = () => bd.que(/FROM proyectos p/)[0];

    beforeEach(() => { bd = new BDFalsa(); });

    it('solo trae proyectos donde el usuario es miembro activo', async () => {
        await listarP();
        expect(sql().sql).toContain('m.id_usuario = $1');
        expect(sql().sql).toContain('m.fecha_baja IS NULL');
        expect(sql().valores).toEqual([10]);
    });
    it('ocultar finalizados agrega el filtro de fecha de fin', async () => {
        await listarP({ incluirFinalizados: false });
        expect(sql().sql).toContain('p.fecha_fin IS NULL OR p.fecha_fin > NOW()');
    });
    it('por defecto incluye los finalizados', async () => {
        await listarP();
        expect(sql().sql).not.toContain('p.fecha_fin > NOW()');
    });
    it('buscar por nombre usa similarity con el umbral', async () => {
        await listarP({ busqueda: 'tesis', umbral: 0.5 });
        expect(sql().sql).toContain('similarity(p.nombre, $2) >= 0.5');
        expect(sql().valores).toEqual([10, 'tesis']);
    });
    it('ordena por la columna y dirección pedidas', async () => {
        await listarP({ ordenarPor: 'fecha_fin', direccion: 'DESC' });
        expect(sql().sql).toContain('ORDER BY p.fecha_fin DESC');
    });
    it('rechaza una columna de orden que no está permitida (inyección)', async () => {
        await expect(listarP({ ordenarPor: 'nombre; DROP TABLE proyectos' })).rejects.toThrow();
    });
});