import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { AsignarTarea } from '../../logicaPersistente/gestionDeTareas/asignarTarea';
import { crearPersistenciaFalsa, filaTarea } from './pruebasComunes';
import { persistenciaPorSql, consultasA } from './persistenciaPorSql';
import { UID_A, UID_B, UID_C } from './pruebasComunes';
import * as alcance from '../../logicaPersistente/gestionDeProyectos/alcance';

vi.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: vi.fn(),
    registrarCambioSiProyecto: vi.fn(),
    filtroAlcance: vi.fn(),
}));

const exigirAcceso = alcance.exigirAcceso as Mock;
const registrarCambio = alcance.registrarCambioSiProyecto as Mock;

beforeEach(() => {
    vi.resetAllMocks();
    exigirAcceso.mockResolvedValue(undefined);
    registrarCambio.mockResolvedValue(undefined);
});

/** Base por SQL para los flujos donde el orden exacto de las consultas no es lo que se verifica. */
function baseAsignar(tarea: Record<string, unknown>, ordenSiguiente = 4) {
    return persistenciaPorSql([
        // El integrante existe y devuelve su id global (proyecto compartido).
        { cuando: /proyecto_miembros/i, filas: (_sql, p) => [{ id_usuario: null, id_global_usuario: p[2] }] },
        { cuando: /MAX\s*\(/i, filas: [{ orden: ordenSiguiente }] },
        { cuando: /^\s*UPDATE tareas/i, filas: (_sql, p) => [filaTarea({ ...tarea, id_asignado: p[1], id_asignado_global: p[2], orden: p[3] })] },
        { cuando: /FROM tareas/i, filas: [filaTarea(tarea)] },
    ]);
}

describe('AsignarTarea', () => {
    describe('asignar a un miembro (test 93)', () => {
        it('asigna a un integrante: valida, calcula el orden al final y actualiza', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_asignado_global: null })],
                [{ id_usuario: null, id_global_usuario: UID_A }],
                [{ orden: 6 }],
                [filaTarea({ id_asignado_global: UID_A, orden: 6 })],
            ]);
            const t = await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_A });

            expect(t).toMatchObject({ idAsignadoGlobal: UID_A, orden: 6 });
            expect(ejecutar.mock.calls[1][0]).toMatch(/proyecto_miembros/);
            expect(ejecutar.mock.calls[1][1]).toEqual([10, null, UID_A]);
            expect(ejecutar.mock.calls[2][1]).toEqual([10, null, UID_A, null]);
            expect(ejecutar.mock.calls[3][0]).toContain('UPDATE tareas SET id_asignado = $2, id_asignado_global = $3, orden = $4');
            expect(ejecutar.mock.calls[3][1]).toEqual([1, null, UID_A, 6]);
        });

        it('registra el cambio con el nuevo idAsignadoGlobal', async () => {
            const { persistencia, tx } = crearPersistenciaFalsa([
                [filaTarea({ id_tarea: 6, id_asignado_global: null })],
                [{ id_usuario: null, id_global_usuario: UID_A }], [{ orden: 1 }],
                [filaTarea({ id_tarea: 6, id_asignado_global: UID_A })],
            ]);
            await new AsignarTarea(persistencia).ejecutar({ idTarea: 6, idUsuario: 5, idAsignadoGlobal: UID_A });
            expect(registrarCambio).toHaveBeenCalledWith(tx, 10, 'tarea', 6, 'modificar', { idAsignadoGlobal: UID_A });
        });

        it('reasignar a otro miembro la deja al final de la columna del nuevo asignado', async () => {
            const { persistencia, ejecutar } = baseAsignar({ id_asignado_global: UID_A }, 3);
            const t = await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_B });
            expect(t).toMatchObject({ idAsignadoGlobal: UID_B, orden: 3 });
            expect(consultasA(ejecutar, /MAX\s*\(/i)[0][1]).toEqual([10, null, UID_B, null]);
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)[0][1]).toEqual([1, null, UID_B, 3]);
        });

        it('no se puede asignar a quien no es miembro activo del proyecto: no actualiza ni registra', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_asignado_global: null })],
                [],                       // no es integrante activo con permiso de edición
                [{ id_remoto: null }],    // y el proyecto no está sincronizado
            ]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_C }))
                .rejects.toThrow(/integrantes activos/);
            expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });

        it('un miembro que solo existe en el servidor se acepta si el proyecto está sincronizado', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([
                [filaTarea({ id_asignado_global: null })],
                [],
                [{ id_remoto: 'R1' }],
                [{ orden: 2 }],
                [filaTarea({ id_asignado_global: UID_C, orden: 2 })],
            ]);
            const t = await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_C });
            expect(t.idAsignadoGlobal).toBe(UID_C);
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)).toHaveLength(1);
        });

        it('una tarea completada sí se puede reasignar a otro miembro', async () => {
            const { persistencia, ejecutar } = baseAsignar({ id_asignado_global: UID_A, completada: true, fecha_completada: new Date() });
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_B })).resolves.toBeDefined();
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)).toHaveLength(1);
        });

        it('asignarla al mismo integrante no escribe nada', async () => {
            const { persistencia, ejecutar } = baseAsignar({ id_asignado_global: UID_A });
            await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_A });
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });
    });

    describe('quitar la asignación (tests 94 y 95)', () => {
        it('94: una tarea pendiente pasa a "Sin asignar" al final de esa columna', async () => {
            const { persistencia, ejecutar, tx } = baseAsignar({ id_asignado_global: UID_A, completada: false }, 4);
            const t = await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: null });
            expect(t).toMatchObject({ idAsignadoGlobal: null, orden: 4 });
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)[0][1]).toEqual([1, null, null, 4]);
            const [sqlOrden, paramsOrden] = consultasA(ejecutar, /MAX\s*\(/i)[0] as [string, unknown[]];
            // "Sin asignar" = sin asignado local ni global (comparación null-safe con los parámetros).
            expect(sqlOrden).toMatch(/id_asignado_global\s+IS\s+NOT\s+DISTINCT\s+FROM\s+\$3/i);
            expect(paramsOrden).toEqual([10, null, null, null]);
            expect(registrarCambio).toHaveBeenCalledWith(tx, 10, 'tarea', 1, 'modificar', { idAsignadoGlobal: null });
        });

        it('95: una tarea hecha no puede quedar sin asignar', async () => {
            const { persistencia, ejecutar } = baseAsignar({ id_asignado_global: UID_A, completada: true, fecha_completada: new Date() });
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: null }))
                .rejects.toThrow(/hecha|completad/i);
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });
    });

    describe('tarea personal', () => {
        it('no se puede asignar', async () => {
            const { persistencia, transaccion } = crearPersistenciaFalsa([
                [filaTarea({ id_proyecto: null, id_usuario: 5, id_asignado_global: null })],
            ]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_A }))
                .rejects.toThrow('Una tarea personal no se puede asignar a otro integrante');
            expect(transaccion).toHaveBeenCalledTimes(1);
        });

        it('tampoco se registra ni se modifica nada', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_proyecto: null, id_usuario: 5 })]]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_A })).rejects.toThrow();
            expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });
    });

    describe('permisos (bug 4: el propietario debe poder asignar)', () => {
        it('exige la acción "tarea.asignar" (propietario o editor; el lector queda afuera)', async () => {
            const { persistencia } = baseAsignar({ id_asignado_global: null });
            await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_A });
            expect(exigirAcceso.mock.calls[0][4]).toBe('tarea.asignar');
        });

        it('valida contra el proyecto de la tarea, con el usuario que opera', async () => {
            const { persistencia } = baseAsignar({ id_proyecto: 10, id_asignado_global: null });
            await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_A });
            expect(exigirAcceso).toHaveBeenCalledWith(persistencia, 10, null, 5, 'tarea.asignar');
        });

        it('si no tiene acceso propaga el error y no actualiza ni registra nada', async () => {
            exigirAcceso.mockRejectedValue(new Error('No tenés permisos para esta operación'));
            const { persistencia, ejecutar } = baseAsignar({ id_asignado_global: null });
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_A }))
                .rejects.toThrow('No tenés permisos para esta operación');
            expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)).toHaveLength(0);
            expect(registrarCambio).not.toHaveBeenCalled();
        });
    });

    describe('errores', () => {
        it('rechaza un id de asignado que no es un id global válido', async () => {
            const { persistencia } = crearPersistenciaFalsa([]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: 'no-es-uuid' }))
                .rejects.toThrow();
        });

        it('si la tarea no existe lanza error', async () => {
            const { persistencia } = crearPersistenciaFalsa([[]]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 999, idUsuario: 5, idAsignadoGlobal: UID_A }))
                .rejects.toThrow(/no existe/i);
        });

        it('propaga errores de la base', async () => {
            const { persistencia } = crearPersistenciaFalsa([[filaTarea({ id_asignado_global: null })], new Error('db caída')]);
            await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignadoGlobal: UID_A }))
                .rejects.toThrow('db caída');
            expect(registrarCambio).not.toHaveBeenCalled();
        });
    });
});
