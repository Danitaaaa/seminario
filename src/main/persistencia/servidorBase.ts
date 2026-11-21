import { existsSync, readdirSync, readFileSync, unlinkSync } from 'fs';
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

  // Se guardan los últimos mensajes de PostgreSQL: si no arranca, dicen por qué (puerto ocupado, permisos…).
  const ultimos: string[] = [];
  const pg = new EmbeddedPostgres({
    databaseDir: carpetaDatos,
    port: conexion.port,
    user: conexion.user,
    password: conexion.password,
    persistent: true,
    // UTF8 (con locale C, que funciona en cualquier Windows): si no, Windows la crea en WIN1252.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: (mensaje) => {
      ultimos.push(String(mensaje).trim());
      if (ultimos.length > 15) ultimos.shift();
    },
    onError: (e) => console.error('[base]', e),
  });

  if (nueva) await pg.initialise();
  else limpiarBloqueoViejo(carpetaDatos);
  try {
    await pg.start();
  } catch (error) {
    // embedded-postgres rechaza sin decir nada cuando PostgreSQL se cierra: se arma el error con lo que dijo.
    const detalle = ultimos.filter(Boolean).join('\n') || (error instanceof Error ? error.message : String(error));
    throw new Error(`PostgreSQL no arrancó:\n${detalle}`);
  }
  try {
    if (nueva) await pg.createDatabase(conexion.database);
    const aplicados = await correrScriptsPendientes(conexion, carpetaScripts);
    return { servidor: pg, aplicados };
  } catch (error) {
    await pg.stop();
    throw error;
  }
}

// Si la app se cerró de golpe (o se mató desde el Administrador de tareas), queda postmaster.pid
// y PostgreSQL no vuelve a arrancar. Si el proceso que lo dejó ya no existe, se borra.
function limpiarBloqueoViejo(carpetaDatos: string): void {
  const archivo = join(carpetaDatos, 'postmaster.pid');
  if (!existsSync(archivo)) return;
  const pid = Number(readFileSync(archivo, 'utf8').split(/\r?\n/)[0]);
  if (Number.isInteger(pid) && pid > 0 && procesoVivo(pid)) return;
  try {
    unlinkSync(archivo);
    console.warn('[base] Se borró un postmaster.pid viejo de un cierre anterior.');
  } catch (error) {
    console.warn('[base] No se pudo borrar postmaster.pid:', error);
  }
}

function procesoVivo(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: existe pero es de otro usuario.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}
