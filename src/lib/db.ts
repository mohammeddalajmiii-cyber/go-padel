import { Pool, type PoolClient } from "pg";

// One shared connection pool (reused between requests and hot reloads).
const globalForDb = globalThis as unknown as { pgPool?: Pool };

function getPool(): Pool {
  if (!globalForDb.pgPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
    }
    globalForDb.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10_000,
    });
  }
  return globalForDb.pgPool;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

/** Runs several queries as one all-or-nothing transaction. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
