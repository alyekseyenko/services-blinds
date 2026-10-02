import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC_ROOT = path.join(process.cwd(), "src");
const ALLOWED = new Set([
  path.normalize("src/lib/crm/opportunities.ts"),
  path.normalize("src/lib/crm/pipelineTransitions.ts"),
]);

const FORBIDDEN_PATTERNS = [
  "updateOpportunityStage",
  "writeOpportunityStageToCrm",
] as const;

function walkTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      files.push(...walkTsFiles(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("pipeline stage write gateway", () => {
  it("only pipeline/opportunities modules reference direct CRM stage writers", () => {
    const violations: string[] = [];

    for (const file of walkTsFiles(SRC_ROOT)) {
      const rel = path.normalize(path.relative(process.cwd(), file));
      if (ALLOWED.has(rel)) continue;

      const content = fs.readFileSync(file, "utf-8");
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (content.includes(pattern)) {
          violations.push(`${rel} references ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
