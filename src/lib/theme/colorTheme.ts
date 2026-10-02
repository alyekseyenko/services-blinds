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
  return "light";
}

const THEME_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export function writeColorThemeCookie(theme: AppColorTheme): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COLOR_THEME_STORAGE_KEY}=${theme};path=/;max-age=${THEME_COOKIE_MAX_AGE_SEC};SameSite=Lax`;
}

/** Tema no <body> (não no <html>) para evitar React hydration #418 no elemento HTML. */
export function applyColorTheme(theme: AppColorTheme): void {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;
  body.classList.toggle("dark", theme === "dark");
  body.dataset.colorTheme = theme;
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("data-color-theme");
  try {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
    writeColorThemeCookie(theme);
  } catch {
    /* ignore */
  }
}

export function readAppliedColorThemeFromDom(): AppColorTheme | null {
  if (typeof document === "undefined") return null;
  const fromBody = document.body?.dataset?.colorTheme;
  if (fromBody === "dark" || fromBody === "light") return fromBody;
  const legacy = document.documentElement.dataset.colorTheme;
  if (legacy === "dark" || legacy === "light") return legacy;
  return null;
}
