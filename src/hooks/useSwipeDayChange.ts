import { useEffect, useRef } from "react";
import { hapticLight } from "@/lib/haptics";
import {
  isIgnoredTouchTarget,
  resolveAxisLock,
  swipeMeetsVelocityOrDistance,
  type AxisLock,
} from "@/lib/gestures/touchGuards";

interface UseSwipeDayChangeOptions {
  enabled?: boolean;
  onPreviousDay: () => void;
  onNextDay: () => void;
  /** Touch target element — pass state from a callback ref so listeners re-bind when mounted. */
  targetElement?: HTMLElement | null;
  /** @deprecated Prefer targetElement */
  getTarget?: () => HTMLElement | null;
  thresholdPx?: number;
  ignoreEdgePx?: number;
}

export function useSwipeDayChange({
  enabled = true,
  onPreviousDay,
  onNextDay,
  targetElement,
  getTarget,
  thresholdPx = 56,
  ignoreEdgePx = 36,
}: UseSwipeDayChangeOptions) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const axisRef = useRef<AxisLock>("none");
  const onPrevRef = useRef(onPreviousDay);
  const onNextRef = useRef(onNextDay);
  onPrevRef.current = onPreviousDay;
  onNextRef.current = onNextDay;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const el = targetElement ?? getTarget?.() ?? null;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (isIgnoredTouchTarget(e.target)) return;
      const x = e.touches[0].clientX;
      const w = window.innerWidth;
      if (ignoreEdgePx > 0 && (x <= ignoreEdgePx || x >= w - ignoreEdgePx)) return;
      axisRef.current = "none";
      startRef.current = { x, y: e.touches[0].clientY, t: performance.now() };
    };

    const onEnd = (e: TouchEvent, cancelled: boolean) => {
      const start = startRef.current;
      startRef.current = null;
      axisRef.current = "none";
      if (!start || cancelled) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const lock = resolveAxisLock(dx, dy, "none");
      if (lock === "vertical") return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

      const durationMs = performance.now() - start.t;
      const signed = Math.abs(dx);
      if (!swipeMeetsVelocityOrDistance(signed, durationMs, thresholdPx)) return;

      if (dx > 0) {
        hapticLight();
        onPrevRef.current();
      } else {
        hapticLight();
        onNextRef.current();
      }
    };

    const onEndHandler = (e: TouchEvent) => onEnd(e, false);
    const onCancelHandler = (e: TouchEvent) => onEnd(e, true);

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEndHandler, { passive: true });
    el.addEventListener("touchcancel", onCancelHandler, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEndHandler);
      el.removeEventListener("touchcancel", onCancelHandler);
    };
  }, [enabled, targetElement, getTarget, thresholdPx, ignoreEdgePx]);
}
