import { app } from 'electron';
import { config } from 'dotenv';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

// Base PostgreSQL propia de Syntra: en la app instalada (o con SYNTRA_BASE_EMBEBIDA=true)
// la base viene adentro de la aplicación y no hace falta Docker.
// Este módulo se importa antes que baseDeDatos para dejar armadas las variables de conexión.

export const usaBaseEmbebida = app.isPackaged || process.env.SYNTRA_BASE_EMBEBIDA === 'true';

const CONEXION = { host: 'localhost', port: 54329, user: 'syntra', password: 'syntra', database: 'syntra' };

// En la app instalada el .env viaja en la carpeta resources.
if (app.isPackaged) config({ path: join(process.resourcesPath, '.env') });

if (usaBaseEmbebida) {
  process.env.POSTGRES_HOST = process.env.DB_HOST = CONEXION.host;
  process.env.POSTGRES_PORT = process.env.DB_PORT = String(CONEXION.port);
  process.env.POSTGRES_USER = process.env.DB_USER = CONEXION.user;
  process.env.POSTGRES_PASSWORD = process.env.DB_PASSWORD = CONEXION.password;
  process.env.POSTGRES_DB = process.env.DB_NAME = CONEXION.database;
}

type Servidor = { start(): Promise<void>; stop(): Promise<void> };
let servidor: Servidor | null = null;

const carpetaScripts = () =>
  app.isPackaged ? join(process.resourcesPath, 'db', 'init') : join(app.getAppPath(), 'db', 'init');

// Corre los scripts de db/init que todavía no se corrieron (la primera vez, todos).
async function correrScriptsPendientes(): Promise<void> {
  const cliente = new Client(CONEXION);
  await cliente.connect();
  try {
    await cliente.query(
      'CREATE TABLE IF NOT EXISTS scripts_aplicados (nombre TEXT PRIMARY KEY, fecha TIMESTAMPTZ NOT NULL DEFAULT now())',
    );
    const { rows } = await cliente.query<{ nombre: string }>('SELECT nombre FROM scripts_aplicados');
    const aplicados = new Set(rows.map((r) => r.nombre));
    const scripts = readdirSync(carpetaScripts()).filter((f) => f.endsWith('.sql')).sort();
    for (const nombre of scripts) {
      if (aplicados.has(nombre)) continue;
      await cliente.query('BEGIN');
      try {
        await cliente.query(readFileSync(join(carpetaScripts(), nombre), 'utf8'));
        await cliente.query('INSERT INTO scripts_aplicados (nombre) VALUES ($1)', [nombre]);
        await cliente.query('COMMIT');
        console.log(`[base] Script aplicado: ${nombre}`);
      } catch (error) {
        await cliente.query('ROLLBACK');
        throw new Error(`Falló el script ${nombre}: ${error instanceof Error ? error.message : error}`);
      }
    }
  } finally {
    await cliente.end();
  }
}

export async function iniciarBaseEmbebida(): Promise<void> {
  if (!usaBaseEmbebida) return;
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const carpetaDatos = join(app.getPath('userData'), 'base');
  const nueva = !existsSync(join(carpetaDatos, 'PG_VERSION'));

  const pg = new EmbeddedPostgres({
    databaseDir: carpetaDatos,
    port: CONEXION.port,
    user: CONEXION.user,
    password: CONEXION.password,
    persistent: true,
    onLog: () => undefined,
    onError: (e) => console.error('[base]', e),
  });

  if (nueva) await pg.initialise();
  await pg.start();
  servidor = pg;
  if (nueva) await pg.createDatabase(CONEXION.database);
  await correrScriptsPendientes();
  console.log('[base] Base de Syntra lista en', carpetaDatos);
}

export async function detenerBaseEmbebida(): Promise<void> {
  if (!servidor) return;
  await servidor.stop();
  servidor = null;
}
