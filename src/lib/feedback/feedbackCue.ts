import {
  isFeedbackSoundEnabled,
  isFeedbackVibrationEnabled,
} from "@/lib/feedback/feedbackPreferences";

let sharedAudioContext: AudioContext | null = null;

type WindowWithWebkit = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithWebkit;
  const AudioCtx = w.AudioContext ?? w.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioCtx();
  }
  return sharedAudioContext;
}

/** Chamado no primeiro toque (ponte de gestos) para cumprir políticas de autoplay. */
export function unlockFeedbackAudioOnGesture(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "suspended") return;
  void ctx.resume().catch(() => {
    /* ignore */
  });
}

function playTone(frequencyHz: number, durationMs: number, gain = 0.075): void {
  if (!isFeedbackSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {
      /* ignore */
    });
  }

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequencyHz;
    gainNode.gain.value = gain;
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const start = ctx.currentTime;
    const end = start + durationMs / 1000;
    gainNode.gain.setValueAtTime(gain, start);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.start(start);
    osc.stop(end + 0.03);
  } catch {
    /* ignore */
  }
}

function pulseAgendaVibration(): void {
  if (!isFeedbackVibrationEnabled()) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate([40, 50, 60]);
  } catch {
    /* ignore */
  }
}

/** Clique curto em botões importantes (som apenas; vibração via haptics). */
export function cueClick(): void {
  playTone(1180, 22, 0.055);
}

/** Um aviso por poll de agenda, com a app visível. */
export function cueNotify(): void {
  if (typeof document === "undefined") return;
  if (document.visibilityState !== "visible") return;

  if (isFeedbackSoundEnabled()) {
    playTone(620, 55, 0.07);
    window.setTimeout(() => playTone(880, 65, 0.065), 85);
  }
  pulseAgendaVibration();
}

/** Testes — fecha contexto partilhado. */
export function resetFeedbackAudioForTests(): void {
  void sharedAudioContext?.close();
  sharedAudioContext = null;
}
