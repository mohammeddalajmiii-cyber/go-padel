import { Pool, type PoolClient } from "pg";
import { SCHEMA } from "./schema";
import { databaseUrl, explainDbError, missingDatabaseUrl } from "./setup";

// One shared connection pool (reused between requests and hot reloads).
const globalForDb = globalThis as unknown as { pgPool?: Pool; dbReady?: Promise<void> };

function getPool(): Pool {
  if (!globalForDb.pgPool) {
    const url = databaseUrl();
    if (!url) throw missingDatabaseUrl();
    globalForDb.pgPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForDb.pgPool;
}

/** Creates any missing tables, once per server start. */
async function createTables(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Only one server instance creates tables at a time.
    await client.query("SELECT pg_advisory_xact_lock(472301)");
    await client.query(SCHEMA);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function ready(): Promise<Pool> {
  const pool = getPool();
  if (!globalForDb.dbReady) {
    globalForDb.dbReady = createTables(pool).catch((err) => {
      globalForDb.dbReady = undefined; // try again on the next request
      throw err;
    });
  }
  await globalForDb.dbReady;
  return pool;
}

/** Re-throws connection problems as clear setup messages. */
function explain(err: unknown): never {
  throw explainDbError(err) ?? err;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  try {
    const res = await (await ready()).query(text, params);
    return res.rows as T[];
  } catch (err) {
    explain(err);
  }
}

/** Runs several queries as one all-or-nothing transaction. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  let client: PoolClient;
  try {
    client = await (await ready()).connect();
  } catch (err) {
    explain(err);
  }
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
