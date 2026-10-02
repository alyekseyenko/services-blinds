import { useEffect, useRef } from "react";
import { hapticLight } from "@/lib/haptics";
import { swipeMeetsVelocityOrDistance } from "@/lib/gestures/touchGuards";

interface UseSwipeToDismissOptions {
  enabled?: boolean;
  onDismiss: () => void;
  /** Panel that moves with the finger (translateY). */
  panelElement?: HTMLElement | null;
  /** Handle to start drag — defaults to panelElement */
  handleElement?: HTMLElement | null;
  /** @deprecated Prefer handleElement */
  getHandle?: () => HTMLElement | null;
  thresholdPx?: number;
}

const DISMISS_RATIO = 0.3;

export function useSwipeToDismiss({
  enabled = true,
  onDismiss,
  panelElement,
  handleElement,
  getHandle,
  thresholdPx = 72,
}: UseSwipeToDismissOptions) {
  const startYRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const draggingRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const handle = handleElement ?? getHandle?.() ?? null;
    const panel = panelElement ?? handle;
    if (!handle || !panel) return;

    const panelHeight = () => panel.getBoundingClientRect().height || 400;

    const setTranslate = (dy: number) => {
      panel.style.transform = dy > 0 ? `translate3d(0, ${dy}px, 0)` : "";
      panel.style.willChange = dy > 0 ? "transform" : "";
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startYRef.current = e.touches[0].clientY;
      startTimeRef.current = performance.now();
      draggingRef.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!draggingRef.current || startYRef.current == null) return;
      if (e.touches.length !== 1) return;
      const dy = Math.max(0, e.touches[0].clientY - startYRef.current);
      setTranslate(dy);
    };

    const onEnd = (e: TouchEvent, cancelled: boolean) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const startY = startYRef.current;
      startYRef.current = null;
      if (startY == null || cancelled) {
        setTranslate(0);
        return;
      }
      const touch = e.changedTouches[0];
      if (!touch) {
        setTranslate(0);
        return;
      }
      const dy = touch.clientY - startY;
      const durationMs = performance.now() - startTimeRef.current;
      const minDy = Math.max(thresholdPx, panelHeight() * DISMISS_RATIO);

      if (
        dy >= minDy ||
        swipeMeetsVelocityOrDistance(dy, durationMs, thresholdPx * 0.6, 0.5)
      ) {
        hapticLight();
        setTranslate(0);
        onDismissRef.current();
        return;
      }
      setTranslate(0);
    };

    handle.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchmove", onMove, { passive: true });
    handle.addEventListener("touchend", (ev) => onEnd(ev, false), { passive: true });
    handle.addEventListener("touchcancel", (ev) => onEnd(ev, true), { passive: true });

    return () => {
      handle.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchmove", onMove);
      handle.removeEventListener("touchend", (ev) => onEnd(ev, false));
      handle.removeEventListener("touchcancel", (ev) => onEnd(ev, true));
      setTranslate(0);
    };
  }, [enabled, panelElement, handleElement, getHandle, thresholdPx]);
}
