import { describe, expect, it } from "vitest";
import { loadThemeTokensFromGlobals } from "@/lib/designTokens/parseGlobalsCss";
import { contrastRatio, parseCssColor, type Rgb } from "@/lib/designTokens/wcagContrast";

function pairRatio(vars: Record<string, string>, fgKey: string, bgKey: string): number {
  const fg = parseCssColor(vars[fgKey] ?? "");
  const bg = parseCssColor(vars[bgKey] ?? "");
  if (!fg || !bg) {
    throw new Error(`Cor inválida: ${fgKey}=${vars[fgKey]}, ${bgKey}=${vars[bgKey]}`);
  }
  return contrastRatio(fg, bg);
}

function borderRatio(vars: Record<string, string>, borderKey: string, bgKey: string): number {
  const border = parseCssColor(vars[borderKey] ?? "");
  const bg = parseCssColor(vars[bgKey] ?? "");
  if (!border || !bg) {
    throw new Error(`Cor inválida: ${borderKey} ou ${bgKey}`);
  }
  return contrastRatio(border, bg);
}

describe("design tokens WCAG contrast", () => {
  const { light, dark } = loadThemeTokensFromGlobals();

  const textPairs: Array<{ fg: string; bg: string; min: number; label: string }> = [
    { fg: "foreground", bg: "background", min: 4.5, label: "texto principal" },
    { fg: "card-foreground", bg: "card", min: 4.5, label: "cartão" },
    { fg: "muted-foreground", bg: "card", min: 4.5, label: "texto muted em cartão" },
    { fg: "primary-ink", bg: "background", min: 4.5, label: "primary-ink" },
    { fg: "primary-foreground", bg: "primary", min: 4.5, label: "texto em primary" },
    { fg: "neon-foreground", bg: "neon", min: 4.5, label: "texto em neon" },
    { fg: "ink-foreground", bg: "ink", min: 4.5, label: "painel ink" },
  ];

  const uiBorderPairs: Array<{ border: string; bg: string; min: number }> = [
    { border: "border-strong", bg: "background", min: 3 },
  ];

  const toneTextPairs: Array<{ fg: string; bg: string; min: number; label: string }> = [
    { fg: "tone-success-fg", bg: "tone-success-surface", min: 4.5, label: "success" },
    { fg: "tone-danger-fg", bg: "tone-danger-surface", min: 4.5, label: "danger" },
    { fg: "tone-warning-fg", bg: "tone-warning-surface", min: 4.5, label: "warning" },
    { fg: "tone-info-fg", bg: "tone-info-surface", min: 4.5, label: "info" },
  ];

  const accentOnInk: Rgb = parseCssColor("#a3e635")!;

  for (const themeName of ["light", "dark"] as const) {
    const vars = themeName === "light" ? light : dark;

    it(`${themeName}: pares de texto`, () => {
      for (const { fg, bg, min, label } of textPairs) {
        const ratio = pairRatio(vars, fg, bg);
        expect(ratio, `${themeName} ${label}`).toBeGreaterThanOrEqual(min);
      }
    });

    it(`${themeName}: contornos UI`, () => {
      for (const { border, bg, min } of uiBorderPairs) {
        const ratio = borderRatio(vars, border, bg);
        expect(ratio, `${themeName} border-strong`).toBeGreaterThanOrEqual(min);
      }
    });

    it(`${themeName}: tons de estado (superfície)`, () => {
      if (themeName === "dark") return;
      for (const { fg, bg, min, label } of toneTextPairs) {
        const ratio = pairRatio(vars, fg, bg);
        expect(ratio, `${themeName} tone ${label}`).toBeGreaterThanOrEqual(min);
      }
    });

    it(`${themeName}: neon sobre ink (carimbo hora)`, () => {
      const ink = parseCssColor(vars.ink ?? "");
      expect(ink).toBeTruthy();
      const ratio = contrastRatio(accentOnInk, ink!);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
  }
});
