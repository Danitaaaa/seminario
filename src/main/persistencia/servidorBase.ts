import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

// Lógica de la base propia de Syntra, sin Electron (así se puede probar con tsx).

export interface Conexion {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface Servidor {
  start(): Promise<void>;
  stop(): Promise<void>;
}

// Corre los scripts .sql de la carpeta que todavía no se corrieron, en orden de nombre.
// Cada script va en su propia transacción: si falla, no queda a medias ni se anota.
// Devuelve los nombres de los scripts que aplicó.
export async function correrScriptsPendientes(conexion: Conexion, carpeta: string): Promise<string[]> {
  const cliente = new Client(conexion);
  await cliente.connect();
  const aplicadosAhora: string[] = [];
  try {
    await cliente.query(
      'CREATE TABLE IF NOT EXISTS scripts_aplicados (nombre TEXT PRIMARY KEY, fecha TIMESTAMPTZ NOT NULL DEFAULT now())',
    );
    const { rows } = await cliente.query<{ nombre: string }>('SELECT nombre FROM scripts_aplicados');
    const yaAplicados = new Set(rows.map((r) => r.nombre));
    const scripts = readdirSync(carpeta).filter((f) => f.endsWith('.sql')).sort();
    for (const nombre of scripts) {
      if (yaAplicados.has(nombre)) continue;
      await cliente.query('BEGIN');
      try {
        await cliente.query(readFileSync(join(carpeta, nombre), 'utf8'));
        await cliente.query('INSERT INTO scripts_aplicados (nombre) VALUES ($1)', [nombre]);
        await cliente.query('COMMIT');
        aplicadosAhora.push(nombre);
      } catch (error) {
        await cliente.query('ROLLBACK');
        throw new Error(`Falló el script ${nombre}: ${error instanceof Error ? error.message : error}`);
      }
    }
  } finally {
    await cliente.end();
  }
  return aplicadosAhora;
}

// Arranca PostgreSQL con los datos en carpetaDatos. La primera vez crea la base;
// siempre corre los scripts pendientes. Devuelve el servidor (para apagarlo) y los scripts aplicados.
export async function levantarBase(
  carpetaDatos: string,
  carpetaScripts: string,
  conexion: Conexion,
): Promise<{ servidor: Servidor; aplicados: string[] }> {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const nueva = !existsSync(join(carpetaDatos, 'PG_VERSION'));

  const pg = new EmbeddedPostgres({
    databaseDir: carpetaDatos,
    port: conexion.port,
    user: conexion.user,
    password: conexion.password,
    persistent: true,
    onLog: () => undefined,
    onError: (e) => console.error('[base]', e),
  });

  if (nueva) await pg.initialise();
  await pg.start();
  try {
    if (nueva) await pg.createDatabase(conexion.database);
    const aplicados = await correrScriptsPendientes(conexion, carpetaScripts);
    return { servidor: pg, aplicados };
  } catch (error) {
    await pg.stop();
    throw error;
  }
}
