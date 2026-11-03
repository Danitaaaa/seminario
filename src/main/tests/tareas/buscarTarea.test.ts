import {
    consultar, buscarTarea, buscarTareaEnTx, exigirAsignable, siguienteOrden, Tx,
} from '../../logicaPersistente/gestionDeTareas/buscarTarea';
import { crearPersistenciaFalsa, filaTarea } from './pruebasComunes';

function txConTransaccion(txObj: any) {
    return {
        ...txObj,
        transaccion: jest.fn(),
    } as unknown as Tx;
}

// La columna "Sin asignar" puede consultarse con `IS NULL` o con una comparación null-safe contra el
// parámetro ($2 = null). Lo que importa es el resultado, no la forma exacta del SQL.
const COLUMNA_SIN_ASIGNAR = /id_asignado_global\s+(IS\s+NULL|IS\s+NOT\s+DISTINCT\s+FROM\s+\$2)/i;
const COLUMNA_DEL_MIEMBRO = /id_asignado_global\s*(=|IS\s+NOT\s+DISTINCT\s+FROM)\s*\$2/i;

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
        const { tx } = crearPersistenciaFalsa([[filaTarea({ id_asignado_global: null, creada_por_global: 1 })]]);
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
            [filaTarea({ id_tarea: 7, id_proyecto: null, creada_por_global: 3 })],
        ]);
        const t = await buscarTarea(persistencia, 7);
        expect(transaccion).toHaveBeenCalledTimes(1);
        expect(t).toMatchObject({ idTarea: 7, idProyecto: null, creadaPor: 3 });
    });

    it('lanza si la tarea no existe', async () => {
        const { persistencia } = crearPersistenciaFalsa([[]]);
        await expect(buscarTarea(persistencia, 999)).rejects.toThrow('La tarea no existe');
    });
});

describe('exigirAsignable', () => {
    it('no lanza si es un integrante activo del proyecto', async () => {
        const { tx } = crearPersistenciaFalsa([[{ '?column?': 1 }]]);
        await expect(exigirAsignable(txConTransaccion(tx), 10, 8)).resolves.toBeUndefined();
    });

    it('consulta por proyecto y usuario, solo membresías sin fecha de baja', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ x: 1 }]]);
        await exigirAsignable(txConTransaccion(tx), 10, 8);
        const [sql, params] = ejecutar.mock.calls[0];
        expect(sql).toContain('proyecto_miembros');
        expect(sql).toMatch(/fecha_baja IS NULL/i);
        expect(params).toEqual([10, 8]);
    });

    it('lanza si no es integrante activo (o fue dado de baja)', async () => {
        const { tx } = crearPersistenciaFalsa([[]]);
        await expect(exigirAsignable(txConTransaccion(tx), 10, 99)).rejects.toThrow(/integrantes activos/i);
    });

    it('propaga errores de la base', async () => {
        const { tx } = crearPersistenciaFalsa([new Error('db caída')]);
        await expect(exigirAsignable(txConTransaccion(tx), 10, 8)).rejects.toThrow('db caída');
    });
});

describe('siguienteOrden', () => {
    it('tarea personal: usa el usuario creador y suma 1 al máximo', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ orden: 4 }]]);
        const txCompleto = txConTransaccion(tx);
        const orden = await siguienteOrden(txCompleto, null, null, 9);
        expect(orden).toBe(4);
        expect(ejecutar.mock.calls[0][0]).toContain('id_proyecto IS NULL AND creada_por_global = $1');
        expect(ejecutar.mock.calls[0][1]).toEqual([9]);
    });

    it('tarea personal sin usuario: lanza en lugar de calcular un orden ambiguo', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ orden: 1 }]]);
        await expect(siguienteOrden(txConTransaccion(tx), null, null)).rejects.toThrow(/usuario/i);
        expect(ejecutar).not.toHaveBeenCalled();
    });

    it('tarea de proyecto asignada: calcula el orden dentro de la columna del miembro', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ orden: 6 }]]);
        const orden = await siguienteOrden(txConTransaccion(tx), 10, 8, 5);
        expect(orden).toBe(6);
        expect(ejecutar.mock.calls[0][1]).toEqual([10, 8]);
        expect(ejecutar.mock.calls[0][0]).toMatch(/id_proyecto\s*=\s*\$1/);
        expect(ejecutar.mock.calls[0][0]).toMatch(COLUMNA_DEL_MIEMBRO);
    });

    it('tarea de proyecto sin asignar: calcula el orden dentro de la columna "Sin asignar"', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ orden: 3 }]]);
        const orden = await siguienteOrden(txConTransaccion(tx), 10, null, 5);
        expect(orden).toBe(3);
        const [sql, params] = ejecutar.mock.calls[0];
        expect(sql).toMatch(/id_proyecto\s*=\s*\$1/);
        expect(sql).toMatch(COLUMNA_SIN_ASIGNAR);
        expect(params[0]).toBe(10);
        expect(params.filter(p => p !== null)).toEqual([10]);   // el único valor no nulo es el proyecto
    });

    it('en un proyecto no depende de quién crea (el creador no entra en la consulta)', async () => {
        const { tx, ejecutar } = crearPersistenciaFalsa([[{ orden: 2 }]]);
        await siguienteOrden(txConTransaccion(tx), 10, null, 5);
        expect(ejecutar.mock.calls[0][0]).not.toMatch(/creada_por_global/i);
        expect(ejecutar.mock.calls[0][1]).not.toContain(5);
    });

    it('devuelve un número aunque la base entregue el máximo como texto', async () => {
        const { tx } = crearPersistenciaFalsa([[{ orden: '5' }]]);
        await expect(siguienteOrden(txConTransaccion(tx), 10, 8, 5)).resolves.toBe(5);
    });

    it('propaga errores de la base', async () => {
        const { tx } = crearPersistenciaFalsa([new Error('db caída')]);
        await expect(siguienteOrden(txConTransaccion(tx), 10, 8, 5)).rejects.toThrow('db caída');
    });
});