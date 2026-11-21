import { Pool, PoolClient, QueryResultRow } from 'pg';
import { IPersistenciaProyectos } from '../logicaPersistente/gestionDeProyectos/interfacesSincronizacion';
import { adaptarValores } from './codificacion';

// Codificación de cada base (se pregunta una sola vez).
const codificaciones = new WeakMap<Pool, Promise<string>>();

export class Persistencia implements IPersistenciaProyectos {
  constructor(
    private readonly baseDeDatos: Pool,
    private readonly ejecutor: Pick<Pool | PoolClient, 'query'> = baseDeDatos,
  ) {}

  async ejecutar<T extends QueryResultRow>(sql: string, valores: unknown[] = []): Promise<T[]> {
    const utf8 = await this.esUtf8();
    const { rows } = await this.ejecutor.query<T>(sql, valores.map((v) => adaptarValores(v, utf8)));
    return rows;
  }

  private esUtf8(): Promise<boolean> {
    let codificacion = codificaciones.get(this.baseDeDatos);
    if (!codificacion) {
      codificacion = this.baseDeDatos
        .query<{ server_encoding: string }>('SHOW server_encoding')
        .then(({ rows }) => rows[0].server_encoding)
        .catch(() => {
          // Si la base todavía no respondió, se vuelve a preguntar la próxima vez.
          codificaciones.delete(this.baseDeDatos);
          return 'UTF8';
        });
      codificaciones.set(this.baseDeDatos, codificacion);
    }
    return codificacion.then((c) => c === 'UTF8');
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