import "server-only";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { Pool as PgPool } from "pg";

let pool: Pool | null = null;

export function isMeasurementsDbConfigured(): boolean {
  return Boolean(process.env.MEASUREMENTS_DATABASE_URL?.trim());
}

export function getMeasurementsPool(): Pool {
  const url = process.env.MEASUREMENTS_DATABASE_URL?.trim();
  if (!url) {
    throw new Error("MEASUREMENTS_DATABASE_URL não está configurado.");
  }
  if (!pool) {
    pool = new PgPool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export async function withMeasurementsTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getMeasurementsPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function measurementsQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await getMeasurementsPool().query<T>(text, params);
  return res.rows;
}

export async function pingMeasurementsDb(): Promise<boolean> {
  if (!isMeasurementsDbConfigured()) return false;
  try {
    await getMeasurementsPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
