import { IPersistenciaProyectos } from '../../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';

// Persistencia falsa con dos colas de respuestas:
//  - lecturas:   lo que devuelve persistencia.ejecutar (consultas fuera de transacción)
//  - escrituras: lo que devuelve tx.ejecutar (consultas dentro de transacción)
export function crearPersistenciaFalsa(lecturas: any[][] = [], escrituras: any[][] = []) {
    const ejecutar = jest.fn(async (_sql: string, _valores?: unknown[]) => lecturas.shift() ?? []);
    const txEjecutar = jest.fn(async (_sql: string, _valores?: unknown[]) => escrituras.shift() ?? []);
    const tx = { ejecutar: txEjecutar };
    const transaccion = jest.fn(async (fn: (tx: any) => Promise<any>) => fn(tx));
    return {
        persistencia: { ejecutar, transaccion } as unknown as IPersistenciaProyectos,
        ejecutar,
        transaccion,
        tx,
        txEjecutar,
    };
}

// Fila tal como la devuelve la BD (snake_case), con valores por defecto sobrescribibles.
export function filaMeta(o: Record<string, any> = {}) {
    return {
        id_meta: 1,
        id_proyecto: null,
        titulo: 'Meta de prueba',
        descripcion: null,
        mes: '2026-10-01',
        mes_texto: '2026-10',
        completada: false,
        fecha_completada: null,
        completada_por: null,
        orden: 1,
        creada_por: 7,
        fecha_creacion: new Date('2026-10-01T12:00:00Z'),
        trasladada_a: null,
        id_meta_origen: null,
        id_global: 'global-1',
        ...o,
    };
}
