/**
 * Vibração tátil via Vibration API (Android Chrome / WebView; iOS Safari não suporta).
 * Feedback imediato no gesto do utilizador; confirmações após async tentam vibrar na mesma cadeia.
 */

const MIN_GAP_MS = 12;

let lastPulseAt = 0;
let gestureBridgeInstalled = false;

function vibrateApiAvailable(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function pulse(pattern: number | number[]): boolean {
  if (!vibrateApiAvailable()) return false;
  const now = Date.now();
  if (now - lastPulseAt < MIN_GAP_MS) return false;
  lastPulseAt = now;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/** Toque curto — botões, swipe de vista, seleção de segmento. */
export function hapticTap(ms = 20): void {
  pulse(ms);
}

/** @deprecated Prefer hapticTap — mantido para imports existentes. */
export function hapticLight(ms = 20): void {
  hapticTap(ms);
}

/** Mudança de opção (estado Concluído / Incompleto / Cancelado). */
export function hapticSelection(): void {
  pulse(14);
}

/** Medida com largura e altura válidas registada na linha. */
export function hapticMeasurementCaptured(): void {
  pulse(18);
}

/** Guardar medições ou concluir visita com sucesso. */
export function hapticSuccess(): void {
  pulse([22, 28, 36]);
}

/** Erro ou validação bloqueada. */
export function hapticError(): void {
  pulse([50, 40, 50]);
}

/** Conclusão de visita (relatório submetido). */
export function hapticTaskComplete(): void {
  pulse([30, 35, 45, 25]);
}

export function isHapticAvailable(): boolean {
  return vibrateApiAvailable();
}

/** Apenas testes — repõe debounce entre casos. */
export function resetHapticThrottleForTests(): void {
  lastPulseAt = 0;
}

/**
 * Mantém o último gesto “vivo” para chamadas logo após pointerup (útil em alguns WebViews).
 * Chamar uma vez no arranque da app (client).
 */
export function installHapticGestureBridge(): () => void {
  if (gestureBridgeInstalled || typeof window === "undefined") {
    return () => {};
  }
  gestureBridgeInstalled = true;

  const onPointerDown = () => {
    (window as Window & { __fieldopsLastGestureAt?: number }).__fieldopsLastGestureAt =
      Date.now();
  };

  window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  return () => {
    window.removeEventListener("pointerdown", onPointerDown, { capture: true });
    gestureBridgeInstalled = false;
  };
}

/** Tenta vibrar após async quando ainda estamos perto do gesto do utilizador. */
export function hapticConfirmAfterAsync(kind: "success" | "error" | "complete" = "success"): void {
  if (typeof window === "undefined") return;
  const last = (window as Window & { __fieldopsLastGestureAt?: number }).__fieldopsLastGestureAt;
  if (last && Date.now() - last < 2500) {
    if (kind === "error") hapticError();
    else if (kind === "complete") hapticTaskComplete();
    else hapticSuccess();
  }
}
