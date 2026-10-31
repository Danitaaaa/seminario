import { IPersistenciaProyectos } from '../../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';

export type Respuesta = unknown[] | Error | ((sql: string, parametros: unknown[]) => unknown[]);

/**
 * Persistencia falsa. Cada llamada a `tx.ejecutar` consume la siguiente respuesta de la cola
 * (en el orden en que el caso de uso hace las consultas). Si la cola se agota devuelve [].
 * Una respuesta puede ser: un arreglo de filas, un Error (se lanza) o una función (sql, params) => filas.
 */
export function crearPersistenciaFalsa(respuestas: Respuesta[] = []) {
    const cola = [...respuestas];
    const ejecutar = jest.fn(async (sql: string, parametros: unknown[]) => {
        const r = cola.shift();
        if (r instanceof Error) throw r;
        if (typeof r === 'function') return r(sql, parametros);
        return r ?? [];
    });
    const tx = { ejecutar };
    const transaccion = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));
    const persistencia = { transaccion } as unknown as IPersistenciaProyectos;
    return { persistencia, ejecutar, transaccion, tx };
}

export function filaTarea(sobrescribir: Record<string, unknown> = {}) {
    return {
        id_tarea: 1,
        id_global: 'g-1',
        id_proyecto: 10,
        titulo: 'Tarea',
        descripcion: null,
        prioridad: 'media',
        fecha_limite: null,
        id_asignado_global: null,
        completada: false,
        fecha_completada: null,
        completada_por_global: null,
        orden: 1,
        creada_por_global: 5,
        fecha_creacion: new Date('2026-01-01T00:00:00Z'),
        ...sobrescribir,
    };
}
