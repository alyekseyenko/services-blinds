/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";
import {
  hapticConfirmAfterAsync,
  hapticMeasurementCaptured,
  hapticSelection,
  hapticTap,
  isHapticAvailable,
  resetHapticThrottleForTests,
} from "../haptics";

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

describe("haptics", () => {
  const vibrate = vi.fn(() => true);

  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("navigator", { vibrate });
    vibrate.mockClear();
    resetHapticThrottleForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("indica disponibilidade quando vibrate existe", () => {
    expect(isHapticAvailable()).toBe(true);
  });

  it("emite pulso curto no toque", () => {
    hapticTap(20);
    expect(vibrate).toHaveBeenCalledWith(20);
  });

  it("debounce evita rajadas no mesmo instante", () => {
    hapticTap();
    hapticTap();
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it("seleção de estado usa pulso dedicado", () => {
    hapticSelection();
    expect(vibrate).toHaveBeenCalledWith(14);
  });

  it("linha de medição completa usa pulso dedicado", async () => {
    vibrate.mockClear();
    await new Promise((r) => setTimeout(r, 20));
    hapticMeasurementCaptured();
    expect(vibrate).toHaveBeenCalledWith(18);
  });

  it("confirmação após async só perto do último gesto", () => {
    (window as Window & { __fieldopsLastGestureAt?: number }).__fieldopsLastGestureAt =
      Date.now();
    vibrate.mockClear();
    hapticConfirmAfterAsync("success");
    expect(vibrate).toHaveBeenCalled();
  });

  it("não vibra quando a preferência de vibração está desligada", () => {
    localStorage.setItem(CLIENT_PREF_KEYS.FEEDBACK_VIBRATION, "off");
    hapticTap();
    expect(vibrate).not.toHaveBeenCalled();
  });
});
