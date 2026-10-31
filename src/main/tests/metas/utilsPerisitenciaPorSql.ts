import { IPersistenciaProyectos } from '../../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';

type Filas = unknown[] | ((sql: string, parametros: unknown[]) => unknown[]);

export interface Regla {
    cuando: RegExp;
    filas: Filas;
}

export function persistenciaPorSql(reglas: Regla[]) {
    const ejecutar = jest.fn(async (sql: string, parametros: unknown[] = []) => {
        const regla = reglas.find(r => r.cuando.test(sql));
        if (!regla) {
            throw new Error(`[persistenciaPorSql] SQL no mockeado detectado:\n--> ${sql.trim()}`);
        }
        return typeof regla.filas === 'function' ? await regla.filas(sql, parametros) : regla.filas;
    });
    
    const tx = { ejecutar };
    const transaccion = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));
    const persistencia = { ejecutar, transaccion } as unknown as IPersistenciaProyectos;
    return { persistencia, ejecutar, transaccion, tx };
}

export function consultasA(ejecutar: jest.Mock, patron: RegExp) {
    return ejecutar.mock.calls.filter(([sql]) => patron.test(sql as string));
}