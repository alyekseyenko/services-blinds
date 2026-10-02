import { readFileSync } from "node:fs";
import path from "node:path";

export type CssVarMap = Record<string, string>;

function extractBlock(css: string, selector: ":root" | ".dark"): string {
  const needle = selector === ":root" ? ":root {" : ".dark {";
  const start = css.indexOf(needle);
  if (start < 0) return "";
  let depth = 0;
  let i = start + needle.length - 1;
  for (; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return css.slice(start, i + 1);
      }
    }
  }
  return "";
}

export function parseCssVariables(block: string): CssVarMap {
  const vars: CssVarMap = {};
  for (const m of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

export function loadThemeTokensFromGlobals(): { light: CssVarMap; dark: CssVarMap } {
  const cssPath = path.join(process.cwd(), "src/styles/design-system.css");
  const css = readFileSync(cssPath, "utf8");
  const lightBlock = extractBlock(css, ":root");
  const darkBlock = extractBlock(css, ".dark");
  const light = parseCssVariables(lightBlock);
  const darkBase = { ...light, ...parseCssVariables(darkBlock) };
  return { light, dark: darkBase };
}
