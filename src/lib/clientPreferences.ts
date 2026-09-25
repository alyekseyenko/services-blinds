/** Keys for user-facing opt-in / consent choices persisted across sessions. */
export const CLIENT_PREF_KEYS = {
  PUSH_OPT_IN: "push_opt_in",
  LOCATION_SHARING: "location_sharing_consent",
  PWA_INSTALL_STATUS: "pwa_install_status",
  PWA_INSTALL_DISMISSED_AT: "pwa_install_dismissed_at",
  COLOR_THEME: "app_color_theme",
} as const;

const PRESERVED_ON_LOGOUT: string[] = [
  CLIENT_PREF_KEYS.PUSH_OPT_IN,
  CLIENT_PREF_KEYS.LOCATION_SHARING,
  CLIENT_PREF_KEYS.PWA_INSTALL_STATUS,
  CLIENT_PREF_KEYS.PWA_INSTALL_DISMISSED_AT,
  CLIENT_PREF_KEYS.COLOR_THEME,
];

/** How long "Not now" suppresses the PWA install banner before it may reappear. */
export const PWA_INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function migrateLegacyPwaDismissal(): void {
  const legacyDismissed = localStorage.getItem("pwa_install_dismissed");
  if (legacyDismissed !== "true") return;

  localStorage.setItem(CLIENT_PREF_KEYS.PWA_INSTALL_STATUS, "dismissed");
  if (!localStorage.getItem(CLIENT_PREF_KEYS.PWA_INSTALL_DISMISSED_AT)) {
    localStorage.setItem(CLIENT_PREF_KEYS.PWA_INSTALL_DISMISSED_AT, String(Date.now()));
  }
  localStorage.removeItem("pwa_install_dismissed");
}

export function isPwaInstallSuppressed(): boolean {
  if (typeof window === "undefined") return true;
  if (isPwaInstalled()) return true;

  migrateLegacyPwaDismissal();

  const status = localStorage.getItem(CLIENT_PREF_KEYS.PWA_INSTALL_STATUS);
  if (status === "installed") return true;

  const dismissedAt = localStorage.getItem(CLIENT_PREF_KEYS.PWA_INSTALL_DISMISSED_AT);
  if (!dismissedAt) return false;

  const elapsed = Date.now() - Number.parseInt(dismissedAt, 10);
  return Number.isFinite(elapsed) && elapsed < PWA_INSTALL_DISMISS_COOLDOWN_MS;
}

export function markPwaInstallDismissed(): void {
  localStorage.setItem(CLIENT_PREF_KEYS.PWA_INSTALL_STATUS, "dismissed");
  localStorage.setItem(CLIENT_PREF_KEYS.PWA_INSTALL_DISMISSED_AT, String(Date.now()));
}

export function markPwaInstalled(): void {
  localStorage.setItem(CLIENT_PREF_KEYS.PWA_INSTALL_STATUS, "installed");
  localStorage.removeItem(CLIENT_PREF_KEYS.PWA_INSTALL_DISMISSED_AT);
}

export function getPushOptInChoice(): "granted" | "denied" | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(CLIENT_PREF_KEYS.PUSH_OPT_IN);
  if (stored === "granted" || stored === "denied") return stored;

  if (typeof Notification !== "undefined") {
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
  }

  return null;
}

export function setPushOptInChoice(value: "granted" | "denied"): void {
  localStorage.setItem(CLIENT_PREF_KEYS.PUSH_OPT_IN, value);
}

/**
 * Clears session data on logout while keeping opt-in / consent preferences.
 * Only a full cache clear or reinstall resets those choices.
 */
export function clearSessionStoragePreservingPreferences(): void {
  const preserved: Record<string, string> = {};
  for (const key of PRESERVED_ON_LOGOUT) {
    const value = localStorage.getItem(key);
    if (value !== null) preserved[key] = value;
  }

  localStorage.clear();
  sessionStorage.clear();

  for (const [key, value] of Object.entries(preserved)) {
    localStorage.setItem(key, value);
  }

  void import("@/lib/db").then(({ clearOfflineUserData }) => clearOfflineUserData());
}
