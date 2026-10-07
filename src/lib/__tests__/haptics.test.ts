/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hapticConfirmAfterAsync,
  hapticMeasurementCaptured,
  hapticSelection,
  hapticTap,
  isHapticAvailable,
  resetHapticThrottleForTests,
} from "../haptics";

describe("haptics", () => {
  const vibrate = vi.fn(() => true);

  beforeEach(() => {
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
});
