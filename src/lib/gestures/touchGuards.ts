const IGNORE_SELECTOR =
  "button, a, input, select, textarea, [role='button'], .gm-style, [data-gesture-ignore]";

/** Touch started on an interactive control or map surface — skip custom gestures. */
export function isIgnoredTouchTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(IGNORE_SELECTOR));
}

/** Inside a modal/dialog — pull-to-refresh must not capture. */
export function isInsideDialog(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("[role='dialog'], [aria-modal='true']"));
}

export type AxisLock = "none" | "horizontal" | "vertical";

const AXIS_LOCK_PX = 10;

/** After ~10px movement, lock to dominant axis. */
export function resolveAxisLock(
  dx: number,
  dy: number,
  current: AxisLock
): AxisLock {
  if (current !== "none") return current;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx < AXIS_LOCK_PX && ady < AXIS_LOCK_PX) return "none";
  if (adx >= ady * 1.15) return "horizontal";
  if (ady >= adx * 1.15) return "vertical";
  return "none";
}

/** Fast flick or long travel counts as intentional swipe. */
export function swipeMeetsVelocityOrDistance(
  signedDelta: number,
  durationMs: number,
  thresholdPx: number,
  minVelocityPxPerMs = 0.35
): boolean {
  if (signedDelta >= thresholdPx) return true;
  if (durationMs <= 0) return false;
  const velocity = signedDelta / durationMs;
  return signedDelta >= thresholdPx * 0.45 && velocity >= minVelocityPxPerMs;
}
