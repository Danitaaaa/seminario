import { vi } from 'vitest';
import { IPersistenciaProyectos } from '../../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';

export type Respuesta = unknown[] | Error | ((sql: string, parametros: unknown[]) => unknown[]);

/**
 * Persistencia falsa. Cada llamada a `tx.ejecutar` consume la siguiente respuesta de la cola
 * (en el orden en que el caso de uso hace las consultas). Si la cola se agota devuelve [].
 * Una respuesta puede ser: un arreglo de filas, un Error (se lanza) o una función (sql, params) => filas.
 */
export function crearPersistenciaFalsa(respuestas: Respuesta[] = []) {
    const cola = [...respuestas];
    const ejecutar = vi.fn(async (sql: string, parametros: unknown[]) => {
        const r = cola.shift();
        if (r instanceof Error) throw r;
        if (typeof r === 'function') return r(sql, parametros);
        return r ?? [];
    });
    const tx = { ejecutar };
    const transaccion = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));
    const persistencia = { transaccion } as unknown as IPersistenciaProyectos;
    return { persistencia, ejecutar, transaccion, tx };
}

// Ids globales de usuario (uid de Supabase): son UUID.
export const UID_A = '11111111-1111-4111-8111-111111111111';
export const UID_B = '22222222-2222-4222-8222-222222222222';
export const UID_C = '33333333-3333-4333-8333-333333333333';

export function filaTarea(sobrescribir: Record<string, unknown> = {}) {
    return {
        id_tarea: 1,
        id_global: 'g-1',
        id_proyecto: 10,
        titulo: 'Tarea',
        descripcion: null,
        prioridad: 'media',
        fecha_limite: null,
        id_usuario: null,         // dueño: solo en tareas personales
        id_asignado: null,
        id_asignado_global: null,
        fecha_inicio: null,
        completada: false,
        fecha_completada: null,
        orden: 1,
        fecha_creacion: new Date('2026-01-01T00:00:00Z'),
        ...sobrescribir,
    };
}
