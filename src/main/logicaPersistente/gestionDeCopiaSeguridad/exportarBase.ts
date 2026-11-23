import type { Persistencia } from '../../persistencia/persistencia';

// Tablas que no se copian: la lista de scripts de db/init ya aplicados es de cada instalación.
export const TABLAS_EXCLUIDAS = ['scripts_aplicados'];

export async function tablasDeLaBase(persistencia: Persistencia): Promise<string[]> {
  const filas = await persistencia.ejecutar<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  return filas.map((f) => f.tablename).filter((t) => !TABLAS_EXCLUIDAS.includes(t));
}

// Todas las filas de todas las tablas, en JSON (una entrada por tabla). Lo arma Postgres:
// así cada tipo (fechas, JSON, binarios) sale en el formato que después sabe volver a leer.
export class ExportarBase {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(): Promise<Record<string, string>> {
    const tablas: Record<string, string> = {};
    for (const tabla of await tablasDeLaBase(this.persistencia)) {
      const [{ datos }] = await this.persistencia.ejecutar<{ datos: string }>(
        `SELECT COALESCE(json_agg(t), '[]'::json)::text AS datos FROM "${tabla}" t`,
      );
      tablas[tabla] = datos;
    }
    return tablas;
  }
}

// Cuántos usuarios tiene la base de esta compu.
export class ContarUsuarios {
  constructor(private readonly persistencia: Persistencia) {}

  async ejecutar(): Promise<number> {
    const [{ cantidad }] = await this.persistencia.ejecutar<{ cantidad: number }>(`SELECT count(*)::int AS cantidad FROM usuarios`);
    return cantidad;
  }
}
