export const PUSH_OPT_IN_RESOLVED_EVENT = "app:push-opt-in-resolved";
/** Push de agenda foi retirado — o tour não deve esperar pelo prompt. */
export function isPushOptInPromptPending(): boolean {
  return false;
}

export function dispatchPushOptInResolved(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PUSH_OPT_IN_RESOLVED_EVENT));
}

/** Autostart tour waits until push prompt is dismissed or not applicable. */
export function waitForPushOptInBeforeOnboarding(timeoutMs = 15 * 60 * 1000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!isPushOptInPromptPending()) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      window.removeEventListener(PUSH_OPT_IN_RESOLVED_EVENT, finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    window.addEventListener(PUSH_OPT_IN_RESOLVED_EVENT, finish);
  });
}
