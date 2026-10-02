import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const DESIGN_CSS = path.join(ROOT, "src/styles/design-system.css");
const GLOBALS_CSS = path.join(ROOT, "src/app/globals.css");

describe("design system — ficheiro único", () => {
  it("design-system.css existe e define :root", () => {
    const css = readFileSync(DESIGN_CSS, "utf8");
    expect(css).toContain(":root");
    expect(css).toContain("--tone-success-solid");
    expect(css).toContain("@utility ds-panel");
    expect(css).toContain("@utility ds-title");
    expect(css).toContain("@utility ds-num");
  });

  it("globals.css importa design-system.css", () => {
    const css = readFileSync(GLOBALS_CSS, "utf8");
    expect(css).toMatch(/@import\s+["'].*design-system\.css["']/);
    expect(css).not.toMatch(/:root\s*\{/);
  });

  it("globals.css usa apenas var(--font-…) para font-family", () => {
    const css = readFileSync(GLOBALS_CSS, "utf8");
    const fontFamilyDecls = css.match(/font-family:\s*[^;]+;/g) ?? [];
    for (const decl of fontFamilyDecls) {
      expect(decl).toMatch(/var\(--font-/);
    }
  });
});
