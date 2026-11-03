import { EliminarMeta } from '../../logicaPersistente/gestionDeMetas/eliminarMeta';
import { exigirAcceso, registrarCambioSiProyecto } from '../../logicaPersistente/gestionDeProyectos/alcance';
import { crearPersistenciaFalsa, filaMeta } from './utilsTest';

jest.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: jest.fn(),
    registrarCambioSiProyecto: jest.fn(),
    filtroAlcance: jest.fn((valores: unknown[], idProyecto: number | null, idUsuario: number) => {
        valores.push(idProyecto ?? idUsuario);
        return idProyecto !== null ? `id_proyecto = $${valores.length}` : `creada_por_global = $${valores.length}`;
    }),
}), { virtual: true });

const acceso = exigirAcceso as jest.Mock;
const registrar = registrarCambioSiProyecto as jest.Mock;

describe('EliminarMeta', () => {
    beforeEach(() => jest.clearAllMocks());

    it('lanza "Meta inexistente" si no existe', async () => {
        const { persistencia, transaccion } = crearPersistenciaFalsa([[]]);
        await expect(new EliminarMeta(persistencia).ejecutar({ idMeta: 9, idUsuario: 7 })).rejects.toThrow('Meta inexistente');
        expect(transaccion).not.toHaveBeenCalled();
    });

    // Spec (reglas de permisos + caso 110): propietario y editor pueden eliminar metas; el lector no.
    it('exige propietario o editor (el lector no puede eliminar)', async () => {
        const actual = filaMeta({ id_proyecto: 4, creada_por_global: 12 });
        const { persistencia } = crearPersistenciaFalsa([[actual]], [[{ id_global: 'g' }]]);
        await new EliminarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
        expect(acceso).toHaveBeenCalledWith(persistencia, 4, 12, 7, 'meta.eliminar');
        expect(acceso.mock.calls[0][4]).toBe('meta.eliminar');
    });

    it('no elimina si no hay permisos', async () => {
        acceso.mockRejectedValueOnce(new Error('Sin permisos'));
        const { persistencia, transaccion } = crearPersistenciaFalsa([[filaMeta()]]);
        await expect(new EliminarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 })).rejects.toThrow('Sin permisos');
        expect(transaccion).not.toHaveBeenCalled();
        expect(registrar).not.toHaveBeenCalled();
    });

    it('ejecuta el DELETE por id_meta pidiendo id_global', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([[filaMeta()]], [[{ id_global: 'g' }]]);
        await new EliminarMeta(persistencia).ejecutar({ idMeta: 5, idUsuario: 7 });
        const [sql, valores] = txEjecutar.mock.calls[0];
        expect(sql).toContain('DELETE FROM metas WHERE id_meta = $1 RETURNING id_global');
        expect(valores).toEqual([5]);
    });

    it('registra el cambio "eliminar" con título e idGlobal', async () => {
        const actual = filaMeta({ id_proyecto: 4, titulo: 'Borrar' });
        const { persistencia, tx } = crearPersistenciaFalsa([[actual]], [[{ id_global: 'abc-123' }]]);
        await new EliminarMeta(persistencia).ejecutar({ idMeta: 5, idUsuario: 7 });
        expect(registrar).toHaveBeenCalledWith(tx, 4, 'meta', 5, 'eliminar', { titulo: 'Borrar', idGlobal: 'abc-123' });
    });

    it('si el DELETE no devuelve filas, idGlobal queda undefined y no rompe', async () => {
        const { persistencia } = crearPersistenciaFalsa([[filaMeta({ titulo: 'T' })]], [[]]);
        await expect(new EliminarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 })).resolves.toBeUndefined();
        expect(registrar).toHaveBeenCalledWith(expect.anything(), null, 'meta', 1, 'eliminar', { titulo: 'T', idGlobal: undefined });
    });

    it('devuelve void', async () => {
        const { persistencia } = crearPersistenciaFalsa([[filaMeta()]], [[{ id_global: 'g' }]]);
        expect(await new EliminarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 })).toBeUndefined();
    });

    it('propaga errores del DELETE sin registrar el cambio', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([[filaMeta()]]);
        txEjecutar.mockRejectedValueOnce(new Error('FK violada'));
        await expect(new EliminarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 })).rejects.toThrow('FK violada');
        expect(registrar).not.toHaveBeenCalled();
    });

    it('rechaza un DTO inválido', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa();
        await expect(new EliminarMeta(persistencia).ejecutar({ idMeta: 'x' as any, idUsuario: 7 })).rejects.toThrow();
        expect(ejecutar).not.toHaveBeenCalled();
    });
});