import { AlternarTarea } from '../../logicaPersistente/gestionDeTareas/alternarTarea';
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

describe('AlternarTarea', () => {
    describe('marcar como hecha (tests 101 y 102)', () => {
        it('invierte el estado si no viene `completada` (pendiente -> hecha)', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_asignado: 8, completada: false })],
                [filaTarea({ id_asignado: 8, completada: true, completada_por: 5 })],
            ]);
            const t = await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 });
            expect(t.completada).toBe(true);
            expect(ejecutar.mock.calls[1][0]).toContain('UPDATE tareas');
            expect(ejecutar.mock.calls[1][1]).toEqual([1, true, 5]);
        });

        it('invierte el estado si no viene `completada` (hecha -> pendiente)', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_asignado: 8, completada: true })],
                [filaTarea({ id_asignado: 8, completada: false })],
            ]);
            const t = await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 });
            expect(t.completada).toBe(false);
            expect(ejecutar.mock.calls[1][1][1]).toBe(false);
        });

        it('`completada` explícita manda sobre el estado actual', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_asignado: 8, completada: false })],
                [filaTarea({ id_asignado: 8, completada: true })],
            ]);
            await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, completada: true });
            expect(ejecutar.mock.calls[1][1]).toEqual([1, true, 5]);
        });

        it('al marcar como hecha registra quién y cuándo la completó', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_asignado: 8 })],
                [filaTarea({ id_asignado: 8, completada: true, completada_por: 5 })],
            ]);
            await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, completada: true });
            const sql = ejecutar.mock.calls[1][0];
            expect(sql).toMatch(/completada_por/);
            expect(sql).toMatch(/fecha_completada/);
            expect(ejecutar.mock.calls[1][1][2]).toBe(5);
        });

        it('al desmarcar vuelve a pendiente y borra la persona y la fecha de cumplimiento', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_asignado: 8, completada: true, completada_por: 5, fecha_completada: new Date('2026-02-01') })],
                [filaTarea({ id_asignado: 8, completada: false, completada_por: null, fecha_completada: null })],
            ]);
            const t = await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, completada: false });
            expect(t.completada).toBe(false);
            const [sql, valores] = ejecutar.mock.calls[1];
            expect(valores[1]).toBe(false);
            expect(sql).toMatch(/completada_por/);
            expect(sql).toMatch(/fecha_completada/);
        });

        it('si la tarea ya está en el estado pedido no escribe ni registra nada', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_asignado: 8, completada: true })]]);
            const t = await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, completada: true });
            expect(t.completada).toBe(true);
            expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });

        it('quien marca puede ser distinto del asignado (queda registrado quién la completó)', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_asignado: 8 })], [filaTarea({ id_asignado: 8, completada: true, completada_por: 5 })],
            ]);
            await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, completada: true });
            expect(ejecutar.mock.calls[1][1][2]).toBe(5);
        });
    });

    describe('tarea sin asignar (test 103)', () => {
        it('no se puede marcar como hecha y se informa que hay que asignarla', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_asignado: null, completada: false })]]);
            await expect(new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, completada: true }))
                .rejects.toThrow(/asign/i);
            expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });

        it('tampoco al invertir (sin `completada`)', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_asignado: null, completada: false })]]);
            await expect(new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 })).rejects.toThrow(/asign/i);
            expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
        });

        it('una tarea personal (sin proyecto) no necesita asignado para marcarse como hecha', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_proyecto: null, id_asignado: null, completada: false })],
                [filaTarea({ id_proyecto: null, id_asignado: null, completada: true })],
            ]);
            const t = await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, completada: true });
            expect(t.completada).toBe(true);
            expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(1);
        });
    });

    describe('permisos (test 104 y regla "Solo lectura: marcar tarea como hecha")', () => {
        it('valida acceso con proyecto y creador de la tarea actual, permitiendo a todos los roles incluido lector', async () => {
            const { persistencia } = crearPersistenciaFalsa([
                [filaTarea({ id_proyecto: 10, creada_por: 77, id_asignado: 8 })],
                [filaTarea({ id_proyecto: 10, creada_por: 77, id_asignado: 8, completada: true })],
            ]);
            await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 });
            expect(exigirAccesoMock).toHaveBeenCalledWith(
                persistencia, 10, 77, 5, expect.arrayContaining(['propietario', 'editor', 'lector']));
            expect(exigirAccesoMock.mock.calls[0][4]).toHaveLength(3);
        });

        it('si no tiene acceso propaga el error y no modifica ni registra nada', async () => {
            exigirAccesoMock.mockRejectedValue(new Error('El usuario no es miembro del proyecto'));
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_asignado: 8 })]]);
            await expect(new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 }))
                .rejects.toThrow('El usuario no es miembro del proyecto');
            expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });

        it('tarea personal: valida con idProyecto null y el creador de la tarea', async () => {
            const { persistencia } = crearPersistenciaFalsa([
                [filaTarea({ id_proyecto: null, creada_por: 5, id_asignado: null })],
                [filaTarea({ id_proyecto: null, creada_por: 5, completada: true })],
            ]);
            await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 });
            expect(exigirAccesoMock.mock.calls[0][1]).toBeNull();
            expect(exigirAccesoMock.mock.calls[0][2]).toBe(5);
        });
    });

    describe('sincronización y errores', () => {
        it('registra el cambio "modificar" de la tarea para sincronizar', async () => {
            const { persistencia, tx } = crearPersistenciaFalsa([
                [filaTarea({ id_tarea: 7, id_asignado: 8 })],
                [filaTarea({ id_tarea: 7, id_asignado: 8, completada: true })],
            ]);
            await new AlternarTarea(persistencia).ejecutar({ idTarea: 7, idUsuario: 5 });
            expect(registrarCambioMock).toHaveBeenCalledWith(tx, 10, 'tarea', 7, 'modificar', expect.anything());
        });

        it('si la tarea no existe lanza error', async () => {
            const { persistencia } = crearPersistenciaFalsa([[]]);
            await expect(new AlternarTarea(persistencia).ejecutar({ idTarea: 999, idUsuario: 5 }))
                .rejects.toThrow('La tarea no existe');
        });

        it('si la tarea no existe no valida permisos ni modifica nada', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[]]);
            await expect(new AlternarTarea(persistencia).ejecutar({ idTarea: 999, idUsuario: 5 })).rejects.toThrow();
            expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });

        it('propaga errores de la base', async () => {
            const { persistencia } = crearPersistenciaFalsa([new Error('db caída')]);
            await expect(new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 })).rejects.toThrow('db caída');
        });
    });
});