import { ModificarMeta } from '../../logicaPersistente/gestionDeMetas/modificarMeta';
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

describe('ModificarMeta', () => {
    beforeEach(() => jest.clearAllMocks());

    it('lanza "Meta inexistente" si la meta no existe', async () => {
        const { persistencia, transaccion } = crearPersistenciaFalsa([[]]);
        await expect(new ModificarMeta(persistencia).ejecutar({ idMeta: 9, idUsuario: 7, titulo: 'X' }))
            .rejects.toThrow('Meta inexistente');
        expect(acceso).not.toHaveBeenCalled();
        expect(transaccion).not.toHaveBeenCalled();
    });

    it('exige propietario o editor usando proyecto y creador de la meta existente', async () => {
        const actual = filaMeta({ id_proyecto: 4, creada_por_global: 12 });
        const { persistencia } = crearPersistenciaFalsa([[actual]], [[actual]]);
        await new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, titulo: 'X' });
        expect(acceso).toHaveBeenCalledWith(persistencia, 4, 12, 7, 'meta.editar');
    });

    it('no actualiza si el usuario no tiene permisos', async () => {
        acceso.mockRejectedValueOnce(new Error('Sin permisos'));
        const { persistencia, transaccion } = crearPersistenciaFalsa([[filaMeta()]]);
        await expect(new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, titulo: 'X' }))
            .rejects.toThrow('Sin permisos');
        expect(transaccion).not.toHaveBeenCalled();
    });

    it('sin campos a modificar devuelve la meta actual sin escribir ni registrar cambios', async () => {
        const { persistencia, transaccion } = crearPersistenciaFalsa([[filaMeta({ titulo: 'Igual' })]]);
        const meta = await new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7 });
        expect(meta.titulo).toBe('Igual');
        expect(transaccion).not.toHaveBeenCalled();
        expect(registrar).not.toHaveBeenCalled();
    });

    it('actualiza solo el título', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([[filaMeta()]], [[filaMeta({ titulo: 'Nuevo' })]]);
        const meta = await new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, titulo: 'Nuevo' });
        const [sql, valores] = txEjecutar.mock.calls[0];
        expect(sql).toContain('UPDATE metas SET titulo = $1 WHERE id_meta = $2');
        expect(valores).toEqual(['Nuevo', 1]);
        expect(meta.titulo).toBe('Nuevo');
    });

    it('actualiza título, descripción y orden con placeholders consecutivos', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([[filaMeta()]], [[filaMeta()]]);
        await new ModificarMeta(persistencia).ejecutar({ idMeta: 5, idUsuario: 7, titulo: 'T', descripcion: 'D', orden: 3 });
        const [sql, valores] = txEjecutar.mock.calls[0];
        expect(sql).toContain('titulo = $1, descripcion = $2, orden = $3 WHERE id_meta = $4');
        expect(valores).toEqual(['T', 'D', 3, 5]);
    });

    it('permite poner la descripción en null', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([[filaMeta({ descripcion: 'vieja' })]], [[filaMeta()]]);
        await new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, descripcion: null });
        const [sql, valores] = txEjecutar.mock.calls[0];
        expect(sql).toContain('descripcion = $1');
        expect(valores).toEqual([null, 1]);
    });

    it('permite orden = 0 (valor falsy pero válido)', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([[filaMeta()]], [[filaMeta({ orden: 0 })]]);
        await new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, orden: 0 });
        expect(txEjecutar.mock.calls[0][1]).toEqual([0, 1]);
    });

    it('no incluye columnas no enviadas', async () => {
        const { persistencia, txEjecutar } = crearPersistenciaFalsa([[filaMeta()]], [[filaMeta()]]);
        await new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, orden: 2 });
        const sql: string = txEjecutar.mock.calls[0][0];
        expect(sql).not.toContain('titulo =');
        expect(sql).not.toContain('descripcion =');
    });

    it('registra el cambio "modificar" con título y orden resultantes', async () => {
        const { persistencia, tx } = crearPersistenciaFalsa(
            [[filaMeta()]], [[filaMeta({ id_meta: 8, id_proyecto: 2, titulo: 'Final', orden: 6 })]]);
        await new ModificarMeta(persistencia).ejecutar({ idMeta: 8, idUsuario: 7, titulo: 'Final' });
        expect(registrar).toHaveBeenCalledWith(tx, 2, 'meta', 8, 'modificar', { titulo: 'Final', orden: 6, fechaLimite: null });
    });

    it('rechaza un DTO inválido antes de consultar', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa();
        await expect(new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, orden: -1 })).rejects.toThrow();
        await expect(new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, titulo: ' ' })).rejects.toThrow();
        expect(ejecutar).not.toHaveBeenCalled();
    });

    it('propaga errores del registro de cambios', async () => {
        registrar.mockRejectedValueOnce(new Error('Fallo sync'));
        const { persistencia } = crearPersistenciaFalsa([[filaMeta()]], [[filaMeta()]]);
        await expect(new ModificarMeta(persistencia).ejecutar({ idMeta: 1, idUsuario: 7, titulo: 'X' }))
            .rejects.toThrow('Fallo sync');
    });
});
