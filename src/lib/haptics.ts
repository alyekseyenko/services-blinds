export function hapticSuccess(ms = 40): void {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(ms);
  } catch {
    // Unsupported
  }
}

export function hapticError(): void {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate([60, 40, 60]);
  } catch {
    // Unsupported
  }
}

export function hapticLight(ms = 20): void {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(ms);
  } catch {
    // Unsupported
  }
}
