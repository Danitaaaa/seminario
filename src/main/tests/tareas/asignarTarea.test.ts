import { AsignarTarea } from '../../logicaPersistente/gestionDeTareas/asignarTarea';
import { crearPersistenciaFalsa, filaTarea } from './pruebasComunes';
import { persistenciaPorSql, consultasA } from './persistenciaPorSql';
import * as alcance from '../../logicaPersistente/gestionDeProyectos/alcance';

jest.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: jest.fn(),
    registrarCambioSiProyecto: jest.fn(),
    filtroAlcance: jest.fn(),
}));

const exigirAcceso = alcance.exigirAcceso as jest.Mock;
const registrarCambio = alcance.registrarCambioSiProyecto as jest.Mock;

beforeEach(() => {
    jest.resetAllMocks();
    exigirAcceso.mockResolvedValue(undefined);
    registrarCambio.mockResolvedValue(undefined);
});

/** Base por SQL para los flujos donde el orden exacto de las consultas no es lo que se verifica. */
function baseAsignar(tarea: Record<string, unknown>, ordenSiguiente = 4) {
    return persistenciaPorSql([
        { cuando: /proyecto_miembros/i, filas: [{ x: 1 }] },
        { cuando: /MAX\s*\(/i, filas: [{ orden: ordenSiguiente }] },
        { cuando: /^\s*UPDATE tareas/i, filas: (_sql, p) => [filaTarea({ ...tarea, id_asignado_global: p[1], orden: p[2] })] },
        { cuando: /FROM tareas/i, filas: [filaTarea(tarea)] },
    ]);
}

describe('AsignarTarea', () => {
    describe('asignar a un miembro (test 93)', () => {
        it('asigna a un integrante: valida, calcula el orden al final y actualiza', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_asignado_global: null })],
                [{ x: 1 }],
                [{ orden: 6 }],
                [filaTarea({ id_asignado_global: 8, orden: 6 })],
            ]);
            const t = await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 8 });

            expect(t).toMatchObject({ idAsignadoGlobal: 8, orden: 6 });
            expect(ejecutar.mock.calls[1][1]).toEqual([10, 8]);
            expect(ejecutar.mock.calls[2][1]).toEqual([10, 8]);
            expect(ejecutar.mock.calls[3][0]).toContain('UPDATE tareas SET id_asignado_global = $2, orden = $3');
            expect(ejecutar.mock.calls[3][1]).toEqual([1, 8, 6]);
        });

        it('registra el cambio con el nuevo idAsignadoGlobal', async () => {
            const { persistencia, tx } = crearPersistenciaFalsa([
                [filaTarea({ id_tarea: 6, id_asignado_global: null })], [{ x: 1 }], [{ orden: 1 }],
                [filaTarea({ id_tarea: 6, id_asignado_global: 8 })],
            ]);
            await new AsignarTarea(persistencia).ejecutar({ idTarea: 6, idUsuario: 5, idAsignadoGlobal: 8 });
            expect(registrarCambio).toHaveBeenCalledWith(tx, 10, 'tarea', 6, 'modificar', { idAsignadoGlobal: 8 });
        });

        it('reasignar a otro miembro la deja al final de la columna del nuevo asignado', async () => {
            const { persistencia, ejecutar } = baseAsignar({ id_asignado_global: 8 }, 3);
            const t = await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 9 });
            expect(t).toMatchObject({ idAsignadoGlobal: 9, orden: 3 });
            expect(consultasA(ejecutar, /MAX\s*\(/i)[0][1]).toEqual([10, 9]);
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)[0][1]).toEqual([1, 9, 3]);
        });

        it('no se puede asignar a quien no es miembro activo del proyecto: no actualiza ni registra', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_asignado_global: null })], []]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 99 })).rejects.toThrow();
            expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });

        it('una tarea completada sí se puede reasignar a otro miembro', async () => {
            const { persistencia, ejecutar } = baseAsignar({ id_asignado_global: 8, completada: true });
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 9 })).resolves.toBeDefined();
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)).toHaveLength(1);
        });
    });

    describe('quitar la asignación (tests 94 y 95)', () => {
        it('94: una tarea pendiente pasa a "Sin asignar" al final de esa columna', async () => {
            const { persistencia, ejecutar, tx } = baseAsignar({ id_asignado_global: 8, completada: false }, 4);
            const t = await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: null });
            expect(t).toMatchObject({ idAsignadoGlobal: null, orden: 4 });
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)[0][1]).toEqual([1, null, 4]);
            const [sqlOrden, paramsOrden] = consultasA(ejecutar, /MAX\s*\(/i)[0] as [string, unknown[]];
            // "Sin asignar" = id_asignado_global nulo: vale `IS NULL` o la comparación null-safe con el parámetro.
            expect(sqlOrden).toMatch(/id_asignado_global\s+(IS\s+NULL|IS\s+NOT\s+DISTINCT\s+FROM\s+\$2)/i);
            expect(paramsOrden.filter(v => v !== null)).toEqual([10]);
            expect(registrarCambio).toHaveBeenCalledWith(tx, 10, 'tarea', 1, 'modificar', { idAsignadoGlobal: null });
        });

        it('95: una tarea hecha no puede quedar sin asignar', async () => {
            const { persistencia, ejecutar } = baseAsignar({ id_asignado_global: 8, completada: true, completada_por_global: 8 });
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: null }))
                .rejects.toThrow(/hecha|completad/i);
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });
    });

    describe('tarea personal', () => {
        it('no se puede asignar', async () => {
            const { persistencia, transaccion } = crearPersistenciaFalsa([
                [filaTarea({ id_proyecto: null, id_asignado_global: null })],
            ]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 8 }))
                .rejects.toThrow('Una tarea personal no se puede asignar a otro integrante');
            expect(transaccion).toHaveBeenCalledTimes(1);
        });

        it('tampoco se registra ni se modifica nada', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_proyecto: null })]]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 8 })).rejects.toThrow();
            expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });
    });

    describe('permisos (bug 4: el propietario debe poder asignar)', () => {
        it('exige propietario o editor y excluye al lector', async () => {
            const { persistencia } = baseAsignar({ id_asignado_global: null });
            await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 8 });
            const roles = exigirAcceso.mock.calls[0][4] as string[];
            expect(exigirAcceso.mock.calls[0][4]).toBe('tarea.asignar');
        });

        it('valida contra el proyecto y el creador de la tarea, con el usuario que opera', async () => {
            const { persistencia } = baseAsignar({ id_proyecto: 10, creada_por_global: 77, id_asignado_global: null });
            await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 8 });
            expect(exigirAcceso).toHaveBeenCalledWith(persistencia, 10, 77, 5, 'tarea.asignar')
        });

        it('si no tiene acceso propaga el error y no actualiza ni registra nada', async () => {
            exigirAcceso.mockRejectedValue(new Error('No tenés permisos para esta operación'));
            const { persistencia, ejecutar } = baseAsignar({ id_asignado_global: null });
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 8 }))
                .rejects.toThrow('No tenés permisos para esta operación');
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });
    });

    describe('errores', () => {
        it('si la tarea no existe lanza error', async () => {
            const { persistencia } = crearPersistenciaFalsa([[]]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 999, idUsuario: 5, idAsignadoGlobal: 8 }))
                .rejects.toThrow(/no existe/i);
        });

        it('propaga errores de la base', async () => {
            const { persistencia } = crearPersistenciaFalsa([[filaTarea({ id_asignado_global: null })], new Error('db caída')]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 8 }))
                .rejects.toThrow('db caída');
            expect(registrarCambio).not.toHaveBeenCalled();
        });
    });
});