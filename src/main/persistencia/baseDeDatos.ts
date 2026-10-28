/*import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

export async function verifyDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[db] Postgres connection OK');
  } finally {
    client.release();
  }
}*/

import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST ?? process.env.POSTGRES_HOST,
  port: Number(process.env.DB_PORT ?? process.env.POSTGRES_PORT) || 5432,
  database: process.env.DB_NAME ?? process.env.POSTGRES_DB,
  user: process.env.DB_USER ?? process.env.POSTGRES_USER,
  password: process.env.DB_PASSWORD ?? process.env.POSTGRES_PASSWORD,
});

export async function verifyDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT current_database() AS db');
    console.log(`[db] Postgres connection OK -> ${rows[0].db}`);
  } finally {
    client.release();
  }
}
