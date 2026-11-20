import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC_ROOT = path.join(process.cwd(), "src");
const MAX_LINES = 600;

/**
 * Ratchet: legados acima do teto não podem crescer até serem extraídos.
 * Quando um ficheiro cai abaixo de MAX_LINES, remova-o deste mapa.
 */
const LEGACY_LINE_LIMITS: Record<string, number> = {};

function shouldScan(rel: string): boolean {
  if (rel.includes("__tests__")) return false;
  if (rel.endsWith(".d.ts")) return false;
  if (/\.test\.(ts|tsx)$/.test(rel)) return false;
  return rel.endsWith(".ts") || rel.endsWith(".tsx");
}

function lineCount(filePath: string): number {
  return fs.readFileSync(filePath, "utf-8").split(/\r?\n/).length;
}

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full));
    } else if (shouldScan(path.relative(SRC_ROOT, full).replace(/\\/g, "/"))) {
      files.push(full);
    }
  }
  return files;
}

describe("file size fitness (anti god-file)", () => {
  it("nenhum ficheiro novo ultrapassa o teto e os legados não crescem", () => {
    const violations: string[] = [];
    const staleLegacy: string[] = [];

    for (const file of walkFiles(SRC_ROOT)) {
      const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
      const count = lineCount(file);
      const cap = LEGACY_LINE_LIMITS[rel];

      if (cap != null) {
        if (count > cap) {
          violations.push(`${rel}: ${count} linhas (limite legado ${cap}) — extraia para a pasta do domínio`);
        }
        if (count <= MAX_LINES) {
          staleLegacy.push(`${rel}: ${count} linhas — remova de LEGACY_LINE_LIMITS`);
        }
        continue;
      }

      if (count > MAX_LINES) {
        violations.push(
          `${rel}: ${count} linhas (máx. ${MAX_LINES}) — crie módulo em src/lib/<domínio>/ ou componente dedicado`
        );
      }
    }

    for (const rel of Object.keys(LEGACY_LINE_LIMITS)) {
      const abs = path.join(process.cwd(), rel);
      if (!fs.existsSync(abs)) {
        violations.push(`${rel}: ficheiro em falta — atualize LEGACY_LINE_LIMITS`);
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
    expect(staleLegacy, staleLegacy.join("\n")).toEqual([]);
  });
});