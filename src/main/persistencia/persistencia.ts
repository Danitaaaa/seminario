import { Pool, PoolClient, QueryResultRow } from 'pg';

export class Persistencia {
  constructor(
    private readonly baseDeDatos: Pool,
    private readonly ejecutor: Pick<Pool | PoolClient, 'query'> = baseDeDatos,
  ) {}

  async ejecutar<T extends QueryResultRow>(sql: string, valores: unknown[] = []): Promise<T[]> {
    const { rows } = await this.ejecutor.query<T>(sql, valores);
    return rows;
  }

  // Ejecuta `trabajo` en una única conexión con BEGIN/COMMIT; ROLLBACK si falla.
  async transaccion<T>(trabajo: (tx: Persistencia) => Promise<T>): Promise<T> {
    const cliente = await this.baseDeDatos.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await trabajo(new Persistencia(this.baseDeDatos, cliente));
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }
}