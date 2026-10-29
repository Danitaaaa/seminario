// Reglas de negocio de tareas de proyecto (tests 85 a 104 del módulo). Los permisos se mockean
// (se prueban en tareas.permisos.por.rol.test.ts); acá se verifica el comportamiento de cada caso de uso.
import { CrearTarea } from '../../logicaPersistente/gestionDeTareas/crearTarea';
import { AsignarTarea } from '../../logicaPersistente/gestionDeTareas/asignarTarea';
import { AlternarTarea } from '../../logicaPersistente/gestionDeTareas/alternarTarea';
import { RepartirTareas } from '../../logicaPersistente/gestionDeTareas/repartirTareas';
import { crearPersistenciaFalsa, filaTarea, Respuesta } from './pruebasComunes';
import { persistenciaPorSql, consultasA } from './persistenciaPorSql';
import * as alcance from '../../logicaPersistente/gestionDeProyectos/alcance';
import * as permisos from '../../logicaPersistente/gestionDeProyectos/permisos';

jest.mock('../../logicaPersistente/gestionDeProyectos/permisos');
jest.mock('../../logicaPersistente/gestionDeProyectos/alcance', () => ({
    exigirAcceso: jest.fn(),
    registrarCambioSiProyecto: jest.fn(),
    filtroAlcance: jest.fn(),
}));

const exigirAcceso = alcance.exigirAcceso as jest.Mock;
const registrarCambio = alcance.registrarCambioSiProyecto as jest.Mock;
const exigirRol = permisos.exigirRol as jest.Mock;

beforeEach(() => {
    jest.resetAllMocks();
    exigirAcceso.mockResolvedValue(undefined);
    registrarCambio.mockResolvedValue(undefined);
    exigirRol.mockResolvedValue('editor');
});

const ID_PROYECTO = 10;

/* ------------------------------------------------------------------ Crear (tests 85, 86) */
describe('CrearTarea en proyecto', () => {
    function baseCrear(esMiembro: boolean, idAsignado: number | null) {
        return persistenciaPorSql([
            { cuando: /proyecto_miembros/i, filas: esMiembro ? [{ x: 1 }] : [] },
            { cuando: /MAX\s*\(/i, filas: [{ orden: 7 }] },
            { cuando: /^\s*INSERT INTO tareas/i, filas: [filaTarea({ id_tarea: 20, id_asignado: idAsignado, orden: 7 })] },
        ]);
    }

    it('85: sin asignar queda con idAsignado null y se registra para sincronizar', async () => {
        const { persistencia, tx } = baseCrear(true, null);
        const t = await new CrearTarea(persistencia).ejecutar({ idUsuario: 5, idProyecto: ID_PROYECTO, titulo: 'T' });
        expect(t.idAsignado).toBeNull();
        expect(registrarCambio).toHaveBeenCalledWith(tx, ID_PROYECTO, 'tarea', 20, 'crear', { titulo: 'T', idAsignado: null });
    });

    it('86: asignada a un miembro queda al final de su columna y se registra con el idAsignado', async () => {
        const { persistencia, ejecutar, tx } = baseCrear(true, 8);
        const t = await new CrearTarea(persistencia).ejecutar({ idUsuario: 5, idProyecto: ID_PROYECTO, titulo: 'T', idAsignado: 8 });
        expect(t).toMatchObject({ idAsignado: 8, orden: 7 });
        const [insert] = consultasA(ejecutar, /^\s*INSERT INTO tareas/i);
        expect(insert[1]).toContain(7);
        expect(insert[1]).toContain(8);
        expect(registrarCambio).toHaveBeenCalledWith(tx, ID_PROYECTO, 'tarea', 20, 'crear', { titulo: 'T', idAsignado: 8 });
    });

    it('no se puede asignar a quien no es miembro activo del proyecto: no inserta nada', async () => {
        const { persistencia, ejecutar } = baseCrear(false, 8);
        await expect(new CrearTarea(persistencia).ejecutar({ idUsuario: 5, idProyecto: ID_PROYECTO, titulo: 'T', idAsignado: 8 }))
            .rejects.toThrow();
        expect(consultasA(ejecutar, /^\s*INSERT/i)).toHaveLength(0);
        expect(registrarCambio).not.toHaveBeenCalled();
    });

    it('una tarea personal no puede nacer asignada a otro usuario (coherente con AsignarTarea)', async () => {
        const { persistencia, ejecutar } = baseCrear(true, 8);
        await expect(new CrearTarea(persistencia).ejecutar({ idUsuario: 5, titulo: 'T', idAsignado: 8 })).rejects.toThrow();
        expect(consultasA(ejecutar, /^\s*INSERT/i)).toHaveLength(0);
    });
});

/* ------------------------------------------------------------------ Asignar (tests 93, 94, 95) */
describe('AsignarTarea', () => {
    function baseAsignar(tarea: Record<string, unknown>, ordenSiguiente = 4) {
        return persistenciaPorSql([
            { cuando: /proyecto_miembros/i, filas: [{ x: 1 }] },
            { cuando: /MAX\s*\(/i, filas: [{ orden: ordenSiguiente }] },
            {
                cuando: /^\s*UPDATE tareas/i,
                filas: (_sql, p) => [filaTarea({ ...tarea, id_asignado: p[1], orden: p[2] })],
            },
            { cuando: /FROM tareas/i, filas: [filaTarea(tarea)] },
        ]);
    }

    it('93: a un miembro que no es del proyecto no se le puede asignar', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_asignado: null })], []]);
        await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignado: 99 })).rejects.toThrow();
        expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
        expect(registrarCambio).not.toHaveBeenCalled();
    });

    it('94: mover una tarea pendiente a "Sin asignar" la deja con idAsignado null al final de esa columna', async () => {
        const { persistencia, ejecutar, tx } = baseAsignar({ id_asignado: 8, completada: false }, 4);
        const t = await new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignado: null });
        expect(t).toMatchObject({ idAsignado: null, orden: 4 });
        const [update] = consultasA(ejecutar, /^\s*UPDATE tareas/i);
        expect(update[1]).toEqual([1, null, 4]);
        expect(registrarCambio).toHaveBeenCalledWith(tx, ID_PROYECTO, 'tarea', 1, 'modificar', { idAsignado: null });
    });

    it('95: una tarea hecha no puede quedar sin asignar', async () => {
        const { persistencia, ejecutar } = baseAsignar({ id_asignado: 8, completada: true, completada_por: 8 });
        await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignado: null }))
            .rejects.toThrow(/hecha|completad/i);
        expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)).toHaveLength(0);
        expect(registrarCambio).not.toHaveBeenCalled();
    });

    it('una tarea hecha sí se puede reasignar a otro miembro', async () => {
        const { persistencia, ejecutar } = baseAsignar({ id_asignado: 8, completada: true });
        await expect(new AsignarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, idAsignado: 9 })).resolves.toBeDefined();
        expect(consultasA(ejecutar, /^\s*UPDATE tareas/i)).toHaveLength(1);
    });
});

/* ------------------------------------------------------------------ Alternar (tests 101, 102, 103) */
describe('AlternarTarea', () => {
    it('101: al marcar como hecha se guarda quién y cuándo, y se registra para sincronizar', async () => {
        const { persistencia, ejecutar, tx } = crearPersistenciaFalsa([
            [filaTarea({ id_asignado: 8, completada: false })],
            [filaTarea({ id_asignado: 8, completada: true, completada_por: 5 })],
        ]);
        await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, completada: true });
        const [sql, valores] = ejecutar.mock.calls[1];
        expect(sql).toMatch(/completada_por/);
        expect(sql).toMatch(/fecha_completada/);
        expect(valores).toEqual([1, true, 5]);
        expect(registrarCambio).toHaveBeenCalledWith(tx, ID_PROYECTO, 'tarea', 1, 'modificar', expect.anything());
    });

    it('102: al desmarcar vuelve a pendiente y se borran la persona y la fecha de cumplimiento', async () => {
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

    it('sin `completada` invierte una tarea hecha a pendiente', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([
            [filaTarea({ id_asignado: 8, completada: true })],
            [filaTarea({ id_asignado: 8, completada: false })],
        ]);
        await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 });
        expect(ejecutar.mock.calls[1][1][1]).toBe(false);
    });

    it('103: no se puede marcar como hecha una tarea sin asignar y se informa que hay que asignarla', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_asignado: null, completada: false })]]);
        await expect(new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5, completada: true }))
            .rejects.toThrow(/asign/i);
        expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
        expect(registrarCambio).not.toHaveBeenCalled();
    });

    it('103: tampoco al invertir (sin `completada`) una tarea sin asignar', async () => {
        const { persistencia, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_asignado: null, completada: false })]]);
        await expect(new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 })).rejects.toThrow(/asign/i);
        expect(consultasA(ejecutar, /UPDATE tareas/)).toHaveLength(0);
    });

    it('104: el lector está entre los roles permitidos para marcar como hecha', async () => {
        const { persistencia } = crearPersistenciaFalsa([
            [filaTarea({ id_asignado: 8 })], [filaTarea({ id_asignado: 8, completada: true })],
        ]);
        await new AlternarTarea(persistencia).ejecutar({ idTarea: 1, idUsuario: 5 });
        const roles = exigirAcceso.mock.calls[0][4] as string[];
        expect(roles).toEqual(expect.arrayContaining(['propietario', 'editor', 'lector']));
    });
});

/* ------------------------------------------------------------------ Repartir (tests 96 a 100) */
describe('RepartirTareas', () => {
    const respuestaUpdate: Respuesta = (_sql, p) => [filaTarea({ id_tarea: p[0], id_asignado: p[1], orden: p[2] })];
    const respuestaOrden: Respuesta = () => [{ orden: 1 }];

    function cola(miembros: number[], cargas: Array<[number, number]>, pendientes: number[]): Respuesta[] {
        const r: Respuesta[] = [
            miembros.map(id => ({ id_usuario: id })),
            cargas.map(([id, n]) => ({ id_asignado: id, n })),
            pendientes.map(id => ({ id_tarea: id })),
        ];
        for (const _ of pendientes) r.push(respuestaOrden, respuestaUpdate);
        return r;
    }

    const repartir = (respuestas: Respuesta[]) => {
        const f = crearPersistenciaFalsa(respuestas);
        return { ...f, promesa: new RepartirTareas(f.persistencia).ejecutar({ idProyecto: ID_PROYECTO, idUsuario: 5 }) };
    };

    const asignaciones = (ejecutar: jest.Mock) =>
        consultasA(ejecutar, /^\s*UPDATE tareas/i).map(([, p]) => ({ idTarea: (p as number[])[0], idAsignado: (p as number[])[1] }));

    const conteo = (a: Array<{ idAsignado: number }>) =>
        a.reduce<Record<number, number>>((acc, x) => ({ ...acc, [x.idAsignado]: (acc[x.idAsignado] ?? 0) + 1 }), {});

    it('96: seis tareas entre tres miembros sin carga: dos para cada uno', async () => {
        const { promesa, ejecutar } = repartir(cola([1, 2, 3], [], [11, 12, 13, 14, 15, 16]));
        await promesa;
        const a = asignaciones(ejecutar);
        expect(a).toHaveLength(6);
        expect(conteo(a)).toEqual({ 1: 2, 2: 2, 3: 2 });
    });

    it('97: con carga previa se asigna primero a quien tiene menos y la diferencia final no supera una tarea', async () => {
        const { promesa, ejecutar } = repartir(cola([1, 2, 3], [[1, 3]], [11, 12, 13, 14]));
        await promesa;
        const a = asignaciones(ejecutar);
        const c = conteo(a);
        const totales = [1, 2, 3].map(id => (id === 1 ? 3 : 0) + (c[id] ?? 0));
        expect(Math.max(...totales) - Math.min(...totales)).toBeLessThanOrEqual(1);
        expect(c[1] ?? 0).toBe(0);                         // el que ya tenía tres no recibe ninguna
    });

    it('98: reparte en el orden en que llegan las pendientes, y la consulta las ordena por fecha límite con las sin fecha al final', async () => {
        const { promesa, ejecutar } = repartir(cola([1, 2, 3], [], [21, 22, 23]));
        await promesa;
        expect(asignaciones(ejecutar).map(x => x.idTarea)).toEqual([21, 22, 23]);
        const sqlPendientes = ejecutar.mock.calls[2][0] as string;
        expect(sqlPendientes).toMatch(/ORDER BY[\s\S]*fecha_limite/i);
        expect(sqlPendientes).toMatch(/NULLS LAST|fecha_limite\s+IS\s+NULL/i);
    });

    it('solo toma las tareas sin asignar del proyecto indicado', async () => {
        const { promesa, ejecutar } = repartir(cola([1, 2], [], [11]));
        await promesa;
        const [sql, params] = ejecutar.mock.calls[2];
        expect(sql).toMatch(/id_asignado IS NULL/i);
        expect(params).toContain(ID_PROYECTO);
    });

    it('99: sin tareas sin asignar no se modifica nada ni se registra ningún cambio', async () => {
        const { promesa, ejecutar } = repartir(cola([1, 2, 3], [], []));
        await promesa;
        expect(asignaciones(ejecutar)).toHaveLength(0);
        expect(registrarCambio).not.toHaveBeenCalled();
    });

    it('100: cada tarea repartida se registra como "modificar" con su nuevo idAsignado', async () => {
        const { promesa, ejecutar, tx } = repartir(cola([1, 2, 3], [], [11, 12, 13]));
        await promesa;
        const a = asignaciones(ejecutar);
        expect(registrarCambio).toHaveBeenCalledTimes(3);
        for (const { idTarea, idAsignado } of a) {
            expect(registrarCambio).toHaveBeenCalledWith(tx, ID_PROYECTO, 'tarea', idTarea, 'modificar', { idAsignado });
        }
    });
});