/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";
import {
  applyFieldContrast,
  resolveInitialFieldContrast,
  readAppliedFieldContrastFromDom,
} from "../fieldContrast";

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

describe("fieldContrast", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    document.documentElement.removeAttribute("data-field-contrast");
  });

  it("resolveInitialFieldContrast lê high do storage", () => {
    localStorage.setItem(CLIENT_PREF_KEYS.FIELD_CONTRAST, "high");
    expect(resolveInitialFieldContrast()).toBe("high");
  });

  it("applyFieldContrast define atributo no html e persiste", () => {
    applyFieldContrast("high");
    expect(document.documentElement.getAttribute("data-field-contrast")).toBe("high");
    expect(localStorage.getItem(CLIENT_PREF_KEYS.FIELD_CONTRAST)).toBe("high");
    expect(readAppliedFieldContrastFromDom()).toBe("high");

    applyFieldContrast("default");
    expect(document.documentElement.hasAttribute("data-field-contrast")).toBe(false);
    expect(localStorage.getItem(CLIENT_PREF_KEYS.FIELD_CONTRAST)).toBeNull();
  });
});
