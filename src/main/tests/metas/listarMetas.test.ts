import { ListarMetas } from '../../logicaPersistente/gestionDeMetas/listarMetas';
import { exigirAcceso, filtroAlcance } from '../../logicaPersistente/gestionDeProyectos/alcance';
import { COLUMNAS_META } from '../../logicaPersistente/gestionDeMetas/materializador';
import { crearPersistenciaFalsa, filaMeta } from './utilsTest';

jest.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: jest.fn(),
    registrarCambioSiProyecto: jest.fn(),
    filtroAlcance: jest.fn((valores: unknown[], idProyecto: number | null, idUsuario: number) => {
        valores.push(idProyecto ?? idUsuario);
        return idProyecto !== null ? `id_proyecto = $${valores.length}` : `creada_por = $${valores.length}`;
    }),
}), { virtual: true });

const acceso = exigirAcceso as jest.Mock;
const filtro = filtroAlcance as jest.Mock;

describe('ListarMetas', () => {
    beforeEach(() => jest.clearAllMocks());

    it('exige acceso de lectura (cualquier rol)', async () => {
        const { persistencia } = crearPersistenciaFalsa([[]]);
        await new ListarMetas(persistencia).ejecutar({ idUsuario: 7, mes: '2026-10', idProyecto: 3 });
        expect(acceso).toHaveBeenCalledWith(persistencia, 3, 7, 7, ['propietario', 'editor', 'lector']);
    });

    it('en metas personales pasa idProyecto null', async () => {
        const { persistencia } = crearPersistenciaFalsa([[]]);
        await new ListarMetas(persistencia).ejecutar({ idUsuario: 7, mes: '2026-10' });
        expect(acceso).toHaveBeenCalledWith(persistencia, null, 7, 7, ['propietario', 'editor', 'lector']);
        expect(filtro).toHaveBeenCalledWith(expect.any(Array), null, 7);
    });

    it('arma la consulta con alcance, mes y ordenamiento', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[]]);
        await new ListarMetas(persistencia).ejecutar({ idUsuario: 7, mes: '2026-10', idProyecto: 3 });
        const [sql, valores] = ejecutar.mock.calls[0];
        expect(sql).toContain(COLUMNAS_META);
        expect(sql).toContain('id_proyecto = $1');
        expect(sql).toContain('mes = $2::date');
        expect(sql).toContain('ORDER BY orden, id_meta');
        expect(valores).toEqual([3, '2026-10-01']);
    });

    it('en metas personales filtra por el usuario', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[]]);
        await new ListarMetas(persistencia).ejecutar({ idUsuario: 7, mes: '2026-10' });
        const [sql, valores] = ejecutar.mock.calls[0];
        expect(sql).toContain('creada_por = $1');
        expect(valores).toEqual([7, '2026-10-01']);
    });

    it('devuelve las metas materializadas respetando el orden recibido', async () => {
        const filas = [
            filaMeta({ id_meta: 2, titulo: 'B', orden: 1 }),
            filaMeta({ id_meta: 1, titulo: 'A', orden: 2, completada: true }),
        ];
        const { persistencia } = crearPersistenciaFalsa([filas]);
        const metas = await new ListarMetas(persistencia).ejecutar({ idUsuario: 7, mes: '2026-10' });
        expect(metas.map(m => m.idMeta)).toEqual([2, 1]);
        expect(metas[1].completada).toBe(true);
        expect(metas[0]).toHaveProperty('trasladadaA', null);
    });

    it('devuelve lista vacía si no hay metas', async () => {
        const { persistencia } = crearPersistenciaFalsa([[]]);
        await expect(new ListarMetas(persistencia).ejecutar({ idUsuario: 7, mes: '2026-10' })).resolves.toEqual([]);
    });

    it('no consulta si el usuario no tiene acceso', async () => {
        acceso.mockRejectedValueOnce(new Error('Sin permisos'));
        const { persistencia, ejecutar } = crearPersistenciaFalsa();
        await expect(new ListarMetas(persistencia).ejecutar({ idUsuario: 7, mes: '2026-10', idProyecto: 3 }))
            .rejects.toThrow('Sin permisos');
        expect(ejecutar).not.toHaveBeenCalled();
    });

    it('rechaza un mes inválido sin tocar la BD', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa();
        await expect(new ListarMetas(persistencia).ejecutar({ idUsuario: 7, mes: '2026-99' })).rejects.toThrow();
        expect(acceso).not.toHaveBeenCalled();
        expect(ejecutar).not.toHaveBeenCalled();
    });

    it('no usa transacción (es una lectura)', async () => {
        const { persistencia, transaccion } = crearPersistenciaFalsa([[]]);
        await new ListarMetas(persistencia).ejecutar({ idUsuario: 7, mes: '2026-10' });
        expect(transaccion).not.toHaveBeenCalled();
    });
});
