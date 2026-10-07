import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";

export type FieldContrastMode = "default" | "high";

export const FIELD_CONTRAST_STORAGE_KEY = CLIENT_PREF_KEYS.FIELD_CONTRAST;

export function resolveInitialFieldContrast(): FieldContrastMode {
  if (typeof window === "undefined") return "default";
  try {
    const stored = localStorage.getItem(FIELD_CONTRAST_STORAGE_KEY);
    if (stored === "high") return "high";
  } catch {
    /* ignore */
  }
  return "default";
}

export function applyFieldContrast(mode: FieldContrastMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "high") {
    root.setAttribute("data-field-contrast", "high");
  } else {
    root.removeAttribute("data-field-contrast");
  }
  try {
    if (mode === "high") {
      localStorage.setItem(FIELD_CONTRAST_STORAGE_KEY, "high");
    } else {
      localStorage.removeItem(FIELD_CONTRAST_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function readAppliedFieldContrastFromDom(): FieldContrastMode | null {
  if (typeof document === "undefined") return null;
  const attr = document.documentElement.getAttribute("data-field-contrast");
  return attr === "high" ? "high" : attr === null ? "default" : null;
}
