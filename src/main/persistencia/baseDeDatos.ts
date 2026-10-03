import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Fail fast in dev if the DB isn't reachable, instead of discovering it
// later when a query silently hangs.
export async function verifyDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[db] Postgres connection OK');
  } finally {
    client.release();
  }
}
