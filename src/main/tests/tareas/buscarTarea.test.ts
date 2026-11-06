import { describe, it, expect, vi } from 'vitest';
import {
    consultar, buscarTarea, buscarTareaEnTx, columnaDeDto, estaSinAsignar, resolverAsignado, siguienteOrden,
    SIN_ASIGNAR, Tx,
} from '../../logicaPersistente/gestionDeTareas/buscarTarea';
import { crearPersistenciaFalsa, filaTarea, UID_A } from './pruebasComunes';

function txConTransaccion(txObj: any) {
    return {
        ...txObj,
        transaccion: vi.fn(),
    } as unknown as Tx;
}

// La columna se compara null-safe contra los parámetros: $2 = asignado local, $3 = asignado global.
const COLUMNA_LOCAL = /id_asignado\s+IS\s+NOT\s+DISTINCT\s+FROM\s+\$2/i;
const COLUMNA_GLOBAL = /id_asignado_global\s+IS\s+NOT\s+DISTINCT\s+FROM\s+\$3/i;

describe('consultar', () => {
    it('delega en tx.ejecutar con sql y parámetros y devuelve las filas', async () => {
        const { tx } = crearPersistenciaFalsa([[{ a: 1 }]]);
        const txCompleto = txConTransaccion(tx);
        const filas = await consultar(txCompleto, 'SELECT 1', [5]);
        expect(tx.ejecutar).toHaveBeenCalledWith('SELECT 1', [5]);
        expect(filas).toEqual([{ a: 1 }]);
    });

    it('sin parámetros usa una lista vacía', async () => {
        const { tx } = crearPersistenciaFalsa([[]]);
        await consultar(txConTransaccion(tx), 'SELECT 1');
        expect(tx.ejecutar).toHaveBeenCalledWith('SELECT 1', []);
    });

    it('propaga errores de la base', async () => {
        const { tx } = crearPersistenciaFalsa([new Error('db caída')]);
        await expect(consultar(txConTransaccion(tx), 'SELECT 1', [])).rejects.toThrow('db caída');
    });
});

describe('buscarTareaEnTx', () => {
    it('devuelve la tarea materializada', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[filaTarea({ id_tarea: 42, titulo: 'X' })]]);
        const txCompleto = txConTransaccion(tx);
        const t = await buscarTareaEnTx(txCompleto, 42);
        expect(t.idTarea).toBe(42);
        expect(t.titulo).toBe('X');
        expect(ejecutar.mock.calls[0][0]).toContain('WHERE id_tarea = $1');
        expect(ejecutar.mock.calls[0][1]).toEqual([42]);
    });

    it('conserva el idAsignadoGlobal nulo de una tarea sin asignar', async () => {
        const { tx } = crearPersistenciaFalsa([[filaTarea({ id_asignado_global: null })]]);
        const t = await buscarTareaEnTx(txConTransaccion(tx), 1);
        expect(t.idAsignadoGlobal).toBeNull();
    });

    it('lanza si la tarea no existe', async () => {
        const { tx } = crearPersistenciaFalsa([[]]);
        await expect(buscarTareaEnTx(txConTransaccion(tx), 999)).rejects.toThrow('La tarea no existe');
    });
});

describe('buscarTarea (con persistencia)', () => {
    it('abre una transacción y devuelve la tarea materializada', async () => {
        const { persistencia, transaccion } = crearPersistenciaFalsa([
            [filaTarea({ id_tarea: 7, id_proyecto: null, id_usuario: 3 })],
        ]);
        const t = await buscarTarea(persistencia, 7);
        expect(transaccion).toHaveBeenCalledTimes(1);
        expect(t).toMatchObject({ idTarea: 7, idProyecto: null, idUsuario: 3 });
    });

    it('lanza si la tarea no existe', async () => {
        const { persistencia } = crearPersistenciaFalsa([[]]);
        await expect(buscarTarea(persistencia, 999)).rejects.toThrow('La tarea no existe');
    });
});

describe('columnas del tablero', () => {
    it('columnaDeDto normaliza los ausentes a null', () => {
        expect(columnaDeDto(undefined, undefined)).toEqual(SIN_ASIGNAR);
        expect(columnaDeDto(null, UID_A)).toEqual({ local: null, global: UID_A });
        expect(columnaDeDto(4, null)).toEqual({ local: 4, global: null });
    });

    it('estaSinAsignar solo es true sin asignado local ni global', () => {
        expect(estaSinAsignar(SIN_ASIGNAR)).toBe(true);
        expect(estaSinAsignar({ local: 4, global: null })).toBe(false);
        expect(estaSinAsignar({ local: null, global: UID_A })).toBe(false);
    });
});

describe('resolverAsignado', () => {
    it('"Sin asignar" no consulta la base', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([]);
        await expect(resolverAsignado(txConTransaccion(tx), 10, SIN_ASIGNAR)).resolves.toEqual(SIN_ASIGNAR);
        expect(ejecutar).not.toHaveBeenCalled();
    });

    it('consulta integrantes activos del proyecto, de cualquier rol (también lectores)', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ id_usuario: 8, id_global_usuario: UID_A }]]);
        await resolverAsignado(txConTransaccion(tx), 10, { local: null, global: UID_A });
        const [sql, params] = ejecutar.mock.calls[0];
        expect(sql).toContain('proyecto_miembros');
        expect(sql).toMatch(/fecha_baja IS NULL/i);
        expect(sql).not.toMatch(/rol IN/);
        expect(params).toEqual([10, null, UID_A]);
    });

    it('si el integrante tiene id global se usa ese (proyecto compartido)', async () => {
        const { tx } = crearPersistenciaFalsa([[{ id_usuario: 8, id_global_usuario: UID_A }]]);
        await expect(resolverAsignado(txConTransaccion(tx), 10, { local: 8, global: null }))
            .resolves.toEqual({ local: null, global: UID_A });
    });

    it('sin id global se usa el id local (proyecto personal)', async () => {
        const { tx } = crearPersistenciaFalsa([[{ id_usuario: 8, id_global_usuario: null }]]);
        await expect(resolverAsignado(txConTransaccion(tx), 10, { local: 8, global: null }))
            .resolves.toEqual({ local: 8, global: null });
    });

    it('acepta a un miembro que solo está en el servidor si el proyecto está sincronizado', async () => {
        const { tx } = crearPersistenciaFalsa([[], [{ id_remoto: 'R1' }]]);
        await expect(resolverAsignado(txConTransaccion(tx), 10, { local: null, global: UID_A }))
            .resolves.toEqual({ local: null, global: UID_A });
    });

    it('lanza si no es integrante activo (o fue dado de baja) y el proyecto no está sincronizado', async () => {
        const { tx } = crearPersistenciaFalsa([[], [{ id_remoto: null }]]);
        await expect(resolverAsignado(txConTransaccion(tx), 10, { local: null, global: UID_A }))
            .rejects.toThrow(/integrantes activos/i);
    });

    it('propaga errores de la base', async () => {
        const { tx } = crearPersistenciaFalsa([new Error('db caída')]);
        await expect(resolverAsignado(txConTransaccion(tx), 10, { local: 8, global: null })).rejects.toThrow('db caída');
    });
});

describe('siguienteOrden', () => {
    it('tarea personal: usa el dueño y suma 1 al máximo', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ orden: 4 }]]);
        const orden = await siguienteOrden(txConTransaccion(tx), null, SIN_ASIGNAR, 9);
        expect(orden).toBe(4);
        const [sql, params] = ejecutar.mock.calls[0];
        expect(sql).toMatch(/id_usuario\s+IS\s+NOT\s+DISTINCT\s+FROM\s+\$4/i);
        expect(params).toEqual([null, null, null, 9]);
    });

    it('tarea de proyecto asignada: calcula el orden dentro de la columna del miembro', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ orden: 6 }]]);
        const orden = await siguienteOrden(txConTransaccion(tx), 10, { local: null, global: UID_A });
        expect(orden).toBe(6);
        const [sql, params] = ejecutar.mock.calls[0];
        expect(params).toEqual([10, null, UID_A, null]);
        expect(sql).toMatch(/id_proyecto\s+IS\s+NOT\s+DISTINCT\s+FROM\s+\$1/i);
        expect(sql).toMatch(COLUMNA_LOCAL);
        expect(sql).toMatch(COLUMNA_GLOBAL);
    });

    it('tarea de proyecto sin asignar: calcula el orden dentro de la columna "Sin asignar"', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ orden: 3 }]]);
        const orden = await siguienteOrden(txConTransaccion(tx), 10, SIN_ASIGNAR);
        expect(orden).toBe(3);
        expect(ejecutar.mock.calls[0][1]).toEqual([10, null, null, null]); // el único valor no nulo es el proyecto
    });

    it('en un proyecto no depende de quién crea (sin dueño en la consulta)', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ orden: 2 }]]);
        await siguienteOrden(txConTransaccion(tx), 10, SIN_ASIGNAR);
        expect(ejecutar.mock.calls[0][1][3]).toBeNull();
    });

    it('devuelve un número aunque la base entregue el máximo como texto', async () => {
        const { tx } = crearPersistenciaFalsa([[{ orden: '5' }]]);
        await expect(siguienteOrden(txConTransaccion(tx), 10, { local: null, global: UID_A })).resolves.toBe(5);
    });

    it('propaga errores de la base', async () => {
        const { tx } = crearPersistenciaFalsa([new Error('db caída')]);
        await expect(siguienteOrden(txConTransaccion(tx), 10, SIN_ASIGNAR)).rejects.toThrow('db caída');
    });
});
