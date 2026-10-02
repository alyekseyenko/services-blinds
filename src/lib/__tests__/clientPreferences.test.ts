import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  CLIENT_PREF_KEYS,
  PWA_INSTALL_DISMISS_COOLDOWN_MS,
  clearSessionStoragePreservingPreferences,
  isPwaInstallSuppressed,
  markPwaInstallDismissed,
  markPwaInstalled,
} from "../clientPreferences";

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("clientPreferences", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("sessionStorage", createStorage());
    vi.stubGlobal("window", {
      matchMedia: () => ({
        matches: false,
        media: "(display-mode: standalone)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
      navigator: { standalone: false },
    });
    vi.restoreAllMocks();
  });

  it("preserves opt-in keys across logout cleanup", () => {
    localStorage.setItem(CLIENT_PREF_KEYS.PUSH_OPT_IN, "denied");
    localStorage.setItem(CLIENT_PREF_KEYS.LOCATION_SHARING, "true");
    localStorage.setItem("measurements_draft_123", "draft");
    sessionStorage.setItem("temp", "value");

    clearSessionStoragePreservingPreferences();

    expect(localStorage.getItem(CLIENT_PREF_KEYS.PUSH_OPT_IN)).toBe("denied");
    expect(localStorage.getItem(CLIENT_PREF_KEYS.LOCATION_SHARING)).toBe("true");
    expect(localStorage.getItem("measurements_draft_123")).toBeNull();
    expect(sessionStorage.getItem("temp")).toBeNull();
  });

  it("suppresses PWA install prompt after dismissal within cooldown", () => {
    markPwaInstallDismissed();
    expect(isPwaInstallSuppressed()).toBe(true);
  });

  it("allows PWA install prompt after cooldown expires", () => {
    const expiredAt = String(Date.now() - PWA_INSTALL_DISMISS_COOLDOWN_MS - 1);
    localStorage.setItem(CLIENT_PREF_KEYS.PWA_INSTALL_STATUS, "dismissed");
    localStorage.setItem(CLIENT_PREF_KEYS.PWA_INSTALL_DISMISSED_AT, expiredAt);
    expect(isPwaInstallSuppressed()).toBe(false);
  });

  it("permanently suppresses PWA install prompt after install", () => {
    markPwaInstalled();
    expect(isPwaInstallSuppressed()).toBe(true);
  });

  it("suppresses PWA install prompt when running in standalone mode", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({
        matches: true,
        media: "(display-mode: standalone)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    expect(isPwaInstallSuppressed()).toBe(true);
  });
});
