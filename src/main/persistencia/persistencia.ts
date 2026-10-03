import { Pool, QueryResultRow } from 'pg';

// Componente "Persistencia": única puerta de entrada para ejecutar
// consultas contra BaseDeDatos. No conoce entidades de dominio ni reglas
// de negocio — solo ejecuta SQL y devuelve filas crudas. Materializar/
// Desmaterializar son quienes transforman esas filas en objetos de dominio.

export class Persistencia {
  constructor(private readonly baseDeDatos: Pool) {}

  async ejecutar<T extends QueryResultRow>(sql: string, valores: unknown[] = []): Promise<T[]> {
    const { rows } = await this.baseDeDatos.query<T>(sql, valores);
    return rows;
  }
}
