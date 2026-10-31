import { EliminarTarea } from '../../logicaPersistente/gestionDeTareas/eliminarTarea';
import { crearPersistenciaFalsa, filaTarea } from './pruebasComunes';
import { consultasA } from './persistenciaPorSql';
import * as alcance from '../../logicaPersistente/gestionDeProyectos/alcance';

jest.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: jest.fn(),
    registrarCambioSiProyecto: jest.fn(),
    filtroAlcance: jest.fn(),
}));

const exigirAccesoMock = alcance.exigirAcceso as jest.Mock;
const registrarCambioMock = alcance.registrarCambioSiProyecto as jest.Mock;

beforeEach(() => {
    jest.resetAllMocks();
    exigirAccesoMock.mockResolvedValue(undefined);
    registrarCambioMock.mockResolvedValue(undefined);
});

describe('EliminarTarea', () => {
    describe('eliminación (test 91)', () => {
        it('elimina la tarea y resuelve sin valor', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_tarea: 4 })], [{ id_global: 'g-4' }],
            ]);
            await expect(new EliminarTarea(persistencia).ejecutar({ idTarea: 4, idUsuario: 5 })).resolves.toBeUndefined();
            expect(ejecutar.mock.calls[1][0]).toContain('DELETE FROM tareas WHERE id_tarea = $1 RETURNING id_global');
            expect(ejecutar.mock.calls[1][1]).toEqual([4]);
        });

        it('registra el cambio "eliminar" con título e idGlobal', async () => {
            const { persistencia, tx } = crearPersistenciaFalsa([
                [filaTarea({ id_tarea: 4, titulo: 'Borrar' })], [{ id_global: 'g-4' }],
            ]);
            await new EliminarTarea(persistencia).ejecutar({ idTarea: 4, idUsuario: 5 });
            expect(registrarCambioMock).toHaveBeenCalledWith(tx, 10, 'tarea', 4, 'eliminar',
                { titulo: 'Borrar', idGlobal: 'g-4' });
        });

        it('una tarea personal se elimina y se delega el registro con idProyecto null', async () => {
            const { persistencia, tx } = crearPersistenciaFalsa([
                [filaTarea({ id_tarea: 4, id_proyecto: null, titulo: 'Mía', creada_por_global: 5 })], [{ id_global: 'g-4' }],
            ]);
            await new EliminarTarea(persistencia).ejecutar({ idTarea: 4, idUsuario: 5 });
            expect(registrarCambioMock).toHaveBeenCalledWith(tx, null, 'tarea', 4, 'eliminar',
                { titulo: 'Mía', idGlobal: 'g-4' });
        });
    });

    describe('permisos (tests 91 y 92, bug exploratorio 3)', () => {
        it('exige rol propietario o editor y excluye al lector', async () => {
            const { persistencia } = crearPersistenciaFalsa([[filaTarea()], [{ id_global: 'g-1' }]]);
            await new EliminarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 });
            const roles = exigirAccesoMock.mock.calls[0][4] as string[];
            expect(roles).toBe('tarea.eliminar');
        });

        it('valida contra el proyecto y el creador de la tarea (un editor puede borrar la de otro miembro)', async () => {
            const { persistencia } = crearPersistenciaFalsa([
                [filaTarea({ id_proyecto: 10, creada_por_global: 77 })], [{ id_global: 'g-1' }],
            ]);
            await new EliminarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 });
            expect(exigirAccesoMock).toHaveBeenCalledWith(persistencia, 10, 77, 5, 'tarea.eliminar');
        });

        it('si no tiene acceso propaga el error y no elimina ni registra nada', async () => {
            exigirAccesoMock.mockRejectedValue(new Error('No tenés permisos para esta operación'));
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea()]]);
            await expect(new EliminarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 }))
                .rejects.toThrow('No tenés permisos para esta operación');
            expect(consultasA(ejecutar, /DELETE/i)).toHaveLength(0);
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });

        it('tarea personal: valida con idProyecto null', async () => {
            const { persistencia } = crearPersistenciaFalsa([
                [filaTarea({ id_proyecto: null, creada_por_global: 5 })], [{ id_global: 'g-1' }],
            ]);
            await new EliminarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 });
            expect(exigirAccesoMock.mock.calls[0][1]).toBeNull();
        });
    });

    describe('errores', () => {
        it('si la tarea no existe lanza error y no borra nada', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[]]);
            await expect(new EliminarTarea(persistencia).ejecutar({ idTarea: 999, idUsuario: 5 }))
                .rejects.toThrow(/no existe/i);
            expect(consultasA(ejecutar, /DELETE/i)).toHaveLength(0);
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });

        it('si falla el borrado propaga el error y no registra el cambio', async () => {
            const { persistencia } = crearPersistenciaFalsa([[filaTarea()], new Error('db caída')]);
            await expect(new EliminarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 })).rejects.toThrow('db caída');
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });
    });
});