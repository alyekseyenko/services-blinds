/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";
import {
  cueClick,
  cueNotify,
  resetFeedbackAudioForTests,
} from "@/lib/feedback/feedbackCue";
import {
  setFeedbackSoundEnabled,
  setFeedbackVibrationEnabled,
} from "@/lib/feedback/feedbackPreferences";

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

describe("feedbackCue", () => {
  const vibrate = vi.fn(() => true);
  const resume = vi.fn(() => Promise.resolve());
  const createOscillator = vi.fn(() => ({
    type: "sine",
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  const createGain = vi.fn(() => ({
    gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }));

  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    localStorage.clear();
    setFeedbackSoundEnabled(true);
    setFeedbackVibrationEnabled(true);
    vi.stubGlobal("navigator", { vibrate });
    vibrate.mockClear();

    class MockAudioContext {
      state = "running";
      currentTime = 0;
      destination = {};
      resume = resume;
      createOscillator = createOscillator;
      createGain = createGain;
      close = vi.fn(() => Promise.resolve());
    }
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("webkitAudioContext", undefined);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    resetFeedbackAudioForTests();
    createOscillator.mockClear();
    createGain.mockClear();
  });

  afterEach(() => {
    resetFeedbackAudioForTests();
    vi.unstubAllGlobals();
  });

  it("cueNotify vibra e tenta som com preferências ligadas", () => {
    cueNotify();
    expect(vibrate).toHaveBeenCalledWith([40, 50, 60]);
    expect(createOscillator).toHaveBeenCalled();
  });

  it("cueNotify não faz nada com a página escondida", () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    cueNotify();
    expect(vibrate).not.toHaveBeenCalled();
    expect(createOscillator).not.toHaveBeenCalled();
  });

  it("som desligado não cria oscilador no aviso", () => {
    localStorage.setItem(CLIENT_PREF_KEYS.FEEDBACK_SOUND, "off");
    cueNotify();
    expect(createOscillator).not.toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalled();
  });

  it("vibração desligada não chama navigator.vibrate no aviso", () => {
    localStorage.setItem(CLIENT_PREF_KEYS.FEEDBACK_VIBRATION, "off");
    cueNotify();
    expect(vibrate).not.toHaveBeenCalled();
    expect(createOscillator).toHaveBeenCalled();
  });

  it("cueClick respeita som desligado", () => {
    localStorage.setItem(CLIENT_PREF_KEYS.FEEDBACK_SOUND, "off");
    cueClick();
    expect(createOscillator).not.toHaveBeenCalled();
  });

});
