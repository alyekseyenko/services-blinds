/** Twenty CRM–inspired neutrals; brand lime stays on --primary. */
export type AppColorTheme = "light" | "dark";

import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";

export const COLOR_THEME_STORAGE_KEY = CLIENT_PREF_KEYS.COLOR_THEME;

export function resolveInitialTheme(): AppColorTheme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyColorTheme(theme: AppColorTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.colorTheme = theme;
  try {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}
