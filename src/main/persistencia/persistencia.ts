import { Pool, QueryResultRow } from 'pg';

export class Persistencia {
  constructor(private readonly baseDeDatos: Pool) {}

  async ejecutar<T extends QueryResultRow>(sql: string, valores: unknown[] = []): Promise<T[]> {
    const { rows } = await this.baseDeDatos.query<T>(sql, valores);
    return rows;
  }
}
