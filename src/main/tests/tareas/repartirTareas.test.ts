import { RepartirTareas } from '../../logicaPersistente/gestionDeTareas/repartirTareas';
import { crearPersistenciaFalsa, filaTarea, Respuesta } from './pruebasComunes';
import { consultasA } from './persistenciaPorSql';
import * as permisos from '../../logicaPersistente/gestionDeProyectos/permisos';
import * as alcance from '../../logicaPersistente/gestionDeProyectos/alcance';

jest.mock('../../logicaPersistente/gestionDeProyectos/permisos');
jest.mock('../../logicaPersistente/gestionDeProyectos/alcance');

const exigirRolMock = permisos.exigirRol as jest.Mock;
const registrarCambioMock = alcance.registrarCambioSiProyecto as jest.Mock;

beforeEach(() => {
    jest.resetAllMocks();
    exigirRolMock.mockResolvedValue(undefined);
    registrarCambioMock.mockResolvedValue(undefined);
});

const ID_PROYECTO = 10;

const respuestaUpdate: Respuesta = (_sql, p) => [
    filaTarea({ id_tarea: p[0], id_asignado: p[1], orden: p[2] }),
];
const respuestaOrden = (n = 1): Respuesta => () => [{ orden: n }];

function cola(miembros: number[], cargas: Array<[number, number]>, pendientes: number[]): Respuesta[] {
    const r: Respuesta[] = [
        miembros.map(id => ({ id_usuario: id })),
        cargas.map(([id, n]) => ({ id_asignado: id, n })),
        pendientes.map(id => ({ id_tarea: id })),
    ];
    for (const _ of pendientes) r.push(respuestaOrden(), respuestaUpdate);
    return r;
}

const ejecutarCaso = (p: any) =>
    new RepartirTareas(p).ejecutar({ idProyecto: ID_PROYECTO, idUsuario: 5 });

const asignaciones = (ejecutar: jest.Mock) =>
    consultasA(ejecutar, /^\s*UPDATE tareas/i).map(([, p]) => ({
        idTarea: (p as number[])[0], idAsignado: (p as number[])[1],
    }));

const conteo = (a: Array<{ idAsignado: number }>) =>
    a.reduce<Record<number, number>>((acc, x) => ({ ...acc, [x.idAsignado]: (acc[x.idAsignado] ?? 0) + 1 }), {});

describe('RepartirTareas', () => {
    describe('permisos', () => {
        it('exige rol propietario o editor sobre el proyecto', async () => {
            const { persistencia } = crearPersistenciaFalsa(cola([1], [], []));
            await ejecutarCaso(persistencia);
            expect(exigirRolMock).toHaveBeenCalledWith(persistencia, ID_PROYECTO, 5, ['propietario', 'editor']);
        });

        it('si el rol no alcanza (lector) propaga el error y no consulta ni modifica nada', async () => {
            exigirRolMock.mockRejectedValue(new Error('No tenés permisos para esta operación'));
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1], [], [11]));
            await expect(ejecutarCaso(persistencia)).rejects.toThrow('No tenés permisos para esta operación');
            expect(ejecutar).not.toHaveBeenCalled();
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });
    });

    describe('selección de tareas y miembros', () => {
        it('solo toma las tareas sin asignar del proyecto indicado', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1, 2], [], [11]));
            await ejecutarCaso(persistencia);
            const [sql, params] = ejecutar.mock.calls[2];
            expect(sql).toMatch(/id_asignado IS NULL/i);
            expect(params).toContain(ID_PROYECTO);
        });

        it('solo reparte entre miembros activos del proyecto', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1, 2], [], [11]));
            await ejecutarCaso(persistencia);
            const [sql, params] = ejecutar.mock.calls[0];
            expect(sql).toMatch(/proyecto_miembros/i);
            expect(sql).toMatch(/fecha_baja IS NULL|estado/i);
            expect(params).toContain(ID_PROYECTO);
        });

        it('solo modifica las tareas que estaban sin asignar', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1, 2], [], [11, 12]));
            await ejecutarCaso(persistencia);
            expect(asignaciones(ejecutar).map(a => a.idTarea).sort()).toEqual([11, 12]);
        });
    });

    describe('equilibrio de carga (tests 96 y 97)', () => {
        it('96: seis tareas entre tres miembros sin carga: dos para cada uno', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1, 2, 3], [], [11, 12, 13, 14, 15, 16]));
            await ejecutarCaso(persistencia);
            const a = asignaciones(ejecutar);
            expect(a).toHaveLength(6);
            expect(conteo(a)).toEqual({ 1: 2, 2: 2, 3: 2 });
        });

        it('97: con carga previa se asigna primero a quienes tienen menos y la diferencia no supera una tarea', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1, 2, 3], [[1, 3]], [11, 12, 13, 14]));
            await ejecutarCaso(persistencia);
            const c = conteo(asignaciones(ejecutar));
            const totales = [1, 2, 3].map(id => (id === 1 ? 3 : 0) + (c[id] ?? 0));
            expect(Math.max(...totales) - Math.min(...totales)).toBeLessThanOrEqual(1);
            expect(c[1] ?? 0).toBe(0);
        });

        it('con cargas distintas todos terminan con el mismo total cuando alcanza', async () => {
            // cargas previas 2, 0, 1 + 6 nuevas = 9 -> 3 cada uno
            const { persistencia, ejecutar } = crearPersistenciaFalsa(
                cola([1, 2, 3], [[1, 2], [3, 1]], [11, 12, 13, 14, 15, 16]));
            await ejecutarCaso(persistencia);
            const c = conteo(asignaciones(ejecutar));
            expect([2 + (c[1] ?? 0), (c[2] ?? 0), 1 + (c[3] ?? 0)]).toEqual([3, 3, 3]);
        });

        it('con menos tareas que miembros, nadie recibe más de una', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1, 2, 3], [], [11, 12]));
            await ejecutarCaso(persistencia);
            const c = conteo(asignaciones(ejecutar));
            expect(Object.values(c).every(n => n === 1)).toBe(true);
            expect(asignaciones(ejecutar)).toHaveLength(2);
        });

        it('un único miembro recibe todas las tareas', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1], [], [11, 12, 13]));
            await ejecutarCaso(persistencia);
            expect(conteo(asignaciones(ejecutar))).toEqual({ 1: 3 });
        });

        it('cada tarea repartida queda al final de la columna de su nuevo asignado', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1, 2], [], [11, 12]));
            await ejecutarCaso(persistencia);
            expect(consultasA(ejecutar, /MAX\s*\(/i)).toHaveLength(2);
            for (const [, p] of consultasA(ejecutar, /^\s*UPDATE tareas/i)) {
                expect((p as number[])[2]).toBe(1);            // orden devuelto por la consulta falsa
            }
        });
    });

    describe('orden según la fecha límite (test 98)', () => {
        it('la consulta ordena por fecha límite con las tareas sin fecha al final', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1, 2, 3], [], [21, 22, 23]));
            await ejecutarCaso(persistencia);
            const sql = ejecutar.mock.calls[2][0];
            expect(sql).toMatch(/ORDER BY[\s\S]*fecha_limite/i);
            expect(sql).toMatch(/NULLS LAST|fecha_limite\s+IS\s+NULL/i);
        });

        it('reparte en el orden en que llegan las pendientes (las que vencen antes, primero)', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1, 2, 3], [], [21, 22, 23]));
            await ejecutarCaso(persistencia);
            expect(asignaciones(ejecutar).map(a => a.idTarea)).toEqual([21, 22, 23]);
        });
    });

    describe('sin tareas pendientes (test 99)', () => {
        it('no modifica ninguna tarea ni registra cambios', async () => {
            const { persistencia, ejecutar } = crearPersistenciaFalsa(cola([1, 2, 3], [], []));
            await ejecutarCaso(persistencia);
            expect(asignaciones(ejecutar)).toHaveLength(0);
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });
    });

    describe('sincronización (test 100)', () => {
        it('cada tarea repartida se registra como "modificar" con su nuevo idAsignado', async () => {
            const { persistencia, ejecutar, tx } = crearPersistenciaFalsa(cola([1, 2, 3], [], [11, 12, 13]));
            await ejecutarCaso(persistencia);
            const a = asignaciones(ejecutar);
            expect(registrarCambioMock).toHaveBeenCalledTimes(3);
            for (const { idTarea, idAsignado } of a) {
                expect(registrarCambioMock).toHaveBeenCalledWith(tx, ID_PROYECTO, 'tarea', idTarea, 'modificar', { idAsignado });
            }
        });

        it('todo el reparto se hace en una sola transacción', async () => {
            const { persistencia, transaccion } = crearPersistenciaFalsa(cola([1, 2], [], [11, 12]));
            await ejecutarCaso(persistencia);
            expect(transaccion).toHaveBeenCalledTimes(1);
        });

        it('si falla una actualización propaga el error y no sigue registrando cambios', async () => {
            const respuestas = cola([1, 2], [], [11, 12]);
            respuestas[4] = new Error('db caída');            // update de la primera tarea
            const { persistencia } = crearPersistenciaFalsa(respuestas);
            await expect(ejecutarCaso(persistencia)).rejects.toThrow('db caída');
            expect(registrarCambioMock).not.toHaveBeenCalled();
        });
    });
});