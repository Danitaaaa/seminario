import { app } from 'electron';
import { config } from 'dotenv';
import { join } from 'path';
import { levantarBase, type Servidor } from './servidorBase';

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

let servidor: Servidor | null = null;

const carpetaScripts = () =>
  app.isPackaged ? join(process.resourcesPath, 'db', 'init') : join(app.getAppPath(), 'db', 'init');

export async function iniciarBaseEmbebida(): Promise<void> {
  if (!usaBaseEmbebida) return;
  const carpetaDatos = join(app.getPath('userData'), 'base');
  const resultado = await levantarBase(carpetaDatos, carpetaScripts(), CONEXION);
  servidor = resultado.servidor;
  for (const nombre of resultado.aplicados) console.log(`[base] Script aplicado: ${nombre}`);
  console.log('[base] Base de Syntra lista en', carpetaDatos);
}

export async function detenerBaseEmbebida(): Promise<void> {
  if (!servidor) return;
  await servidor.stop();
  servidor = null;
}
