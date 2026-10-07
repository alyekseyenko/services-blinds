import "server-only";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getMeasurementsPool, isMeasurementsDbConfigured } from "./client";

const MIGRATIONS_DIR = join(process.cwd(), "src/lib/measurements/db/migrations");

export async function runMeasurementsMigrations(): Promise<void> {
  if (!isMeasurementsDbConfigured()) {
    return;
  }

  const pool = getMeasurementsPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS measurement_schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = await pool.query<{ name: string }>(
    "SELECT name FROM measurement_schema_migrations"
  );
  const appliedSet = new Set(applied.rows.map((r) => r.name));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO measurement_schema_migrations (name) VALUES ($1)", [
        file,
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
