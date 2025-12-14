import { Pool, PoolClient } from 'pg';

export let pool: Pool | null = null;

export function initializePool(connectionString: string): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool first.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function withClient<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]) {
  return getPool().query(text, params);
}
