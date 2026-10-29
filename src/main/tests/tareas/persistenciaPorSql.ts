import { IPersistenciaProyectos } from '../../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';

type Filas = unknown[] | ((sql: string, parametros: unknown[]) => unknown[]);

export interface Regla {
    cuando: RegExp;
    filas: Filas;
}

/**
 * Persistencia falsa que responde según el SQL recibido (la primera regla que coincide gana),
 * en lugar de según el orden de las consultas. Sirve para probar a través de permisos.ts y
 * alcance.ts reales, donde el orden exacto de consultas no es lo que se quiere verificar.
 * Expone `ejecutar` tanto en la persistencia como en la transacción.
 */
export function persistenciaPorSql(reglas: Regla[]) {
    const ejecutar = jest.fn(async (sql: string, parametros: unknown[] = []) => {
        const regla = reglas.find(r => r.cuando.test(sql));
        if (!regla) return [];
        return typeof regla.filas === 'function' ? regla.filas(sql, parametros) : regla.filas;
    });
    const tx = { ejecutar };
    const transaccion = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));
    const persistencia = { ejecutar, transaccion } as unknown as IPersistenciaProyectos;
    return { persistencia, ejecutar, transaccion, tx };
}

/** Llamadas a `ejecutar` cuyo SQL coincide con el patrón. */
export function consultasA(ejecutar: jest.Mock, patron: RegExp) {
    return ejecutar.mock.calls.filter(([sql]) => patron.test(sql as string));
}