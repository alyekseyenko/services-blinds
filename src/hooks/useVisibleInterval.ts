import { useEffect, useRef } from "react";

type UseVisibleIntervalOptions = {
  enabled?: boolean;
  runImmediately?: boolean;
};

/** Interval that pauses while the document tab is hidden. */
export function useVisibleInterval(
  callback: () => void,
  delayMs: number | null,
  options: UseVisibleIntervalOptions = {}
) {
  const { enabled = true, runImmediately = false } = options;
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || delayMs === null || delayMs <= 0) return;

    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      savedCallback.current();
    };

    if (runImmediately) tick();

    const id = window.setInterval(tick, delayMs);
    return () => clearInterval(id);
  }, [delayMs, enabled, runImmediately]);
}
