// ============================================
// MEDASSIST AI - PostgreSQL connection pool
// ============================================
import { Pool, QueryResult, QueryResultRow } from 'pg';

export const pool = new Pool({
  user: process.env.DB_USER || 'medassist',
  password: process.env.DB_PASSWORD || 'medassist123',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'medassist',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('❌ Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Thin query helper so controllers don't manage client checkout/release directly.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

export default pool;
