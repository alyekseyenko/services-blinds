import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function loadEnvLocalIntoProcess(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

describe("seedMapTrainingOpportunitiesInCrm (live CRM)", () => {
  it.skipIf(process.env.RUN_MAP_TRAINING_SEED !== "1")(
    "creates map training opportunities for test clients",
    async () => {
      loadEnvLocalIntoProcess();
      const { seedMapTrainingOpportunitiesInCrm } = await import("@/lib/demo/seedMapTrainingCrm");
      const result = await seedMapTrainingOpportunitiesInCrm();
      expect(result.error).toBeUndefined();
      expect(result.clientsUsed.length).toBeGreaterThan(0);
      expect(result.created.length + result.skipped.length).toBe(20);
    },
    120_000
  );
});
