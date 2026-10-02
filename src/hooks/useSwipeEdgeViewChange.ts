import { useEffect, useRef } from "react";
import { hapticLight } from "@/lib/haptics";
import { adjacentTechMainView, techMainViewLabel } from "@/lib/techMainViews";
import {
  isIgnoredTouchTarget,
  swipeMeetsVelocityOrDistance,
} from "@/lib/gestures/touchGuards";

export type EdgeViewSwipeHint =
  | { phase: "idle" }
  | {
      phase: "dragging";
      direction: "prev" | "next";
      progress: number;
      targetView: string;
      targetLabel: string;
    };

interface UseSwipeEdgeViewChangeOptions {
  enabled?: boolean;
  currentView: string;
  onViewChange: (nextView: string) => void;
  targetElement?: HTMLElement | null;
  /** @deprecated Prefer targetElement */
  getTarget?: () => HTMLElement | null;
  onHint?: (hint: EdgeViewSwipeHint) => void;
  edgeInsetPx?: number;
  thresholdPx?: number;
}

const DRAG_START_PX = 10;

export function useSwipeEdgeViewChange({
  enabled = true,
  currentView,
  onViewChange,
  targetElement,
  getTarget,
  onHint,
  edgeInsetPx = 36,
  thresholdPx = 72,
}: UseSwipeEdgeViewChangeOptions) {
  const startRef = useRef<{
    x: number;
    y: number;
    t: number;
    fromLeft: boolean;
    fromRight: boolean;
    direction: "prev" | "next";
    targetView: string;
    dragging: boolean;
  } | null>(null);

  const onViewChangeRef = useRef(onViewChange);
  const onHintRef = useRef(onHint);
  const currentViewRef = useRef(currentView);
  const rafHintRef = useRef<number | null>(null);
  onViewChangeRef.current = onViewChange;
  onHintRef.current = onHint;
  currentViewRef.current = currentView;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const el = targetElement ?? getTarget?.() ?? null;
    if (!el) return;

    const setIdle = () => onHintRef.current?.({ phase: "idle" });

    const emitHint = (hint: EdgeViewSwipeHint) => {
      if (rafHintRef.current != null) cancelAnimationFrame(rafHintRef.current);
      rafHintRef.current = requestAnimationFrame(() => {
        rafHintRef.current = null;
        onHintRef.current?.(hint);
      });
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (isIgnoredTouchTarget(e.target)) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const w = window.innerWidth;
      const fromLeft = x <= edgeInsetPx;
      const fromRight = x >= w - edgeInsetPx;
      if (!fromLeft && !fromRight) return;

      const direction: "prev" | "next" = fromLeft ? "prev" : "next";
      const delta = direction === "prev" ? -1 : 1;
      const targetView = adjacentTechMainView(currentViewRef.current, delta);
      if (!targetView) return;

      startRef.current = {
        x,
        y,
        t: performance.now(),
        fromLeft,
        fromRight,
        direction,
        targetView,
        dragging: false,
      };
    };

    const onMove = (e: TouchEvent) => {
      const start = startRef.current;
      if (!start || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;

      if (!start.dragging) {
        if (Math.abs(dx) < DRAG_START_PX && Math.abs(dy) < DRAG_START_PX) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.25) {
          startRef.current = null;
          setIdle();
          return;
        }
        start.dragging = true;
      }

      if (Math.abs(dy) > Math.abs(dx) * 1.25) {
        startRef.current = null;
        setIdle();
        return;
      }

      const signed = start.direction === "prev" ? dx : -dx;
      if (signed < 0) {
        emitHint({
          phase: "dragging",
          direction: start.direction,
          progress: 0,
          targetView: start.targetView,
          targetLabel: techMainViewLabel(start.targetView),
        });
        return;
      }

      const progress = Math.min(signed / thresholdPx, 1.15);
      emitHint({
        phase: "dragging",
        direction: start.direction,
        progress,
        targetView: start.targetView,
        targetLabel: techMainViewLabel(start.targetView),
      });
    };

    const onEnd = (e: TouchEvent, cancelled: boolean) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start || cancelled) {
        setIdle();
        return;
      }
      const touch = e.changedTouches[0];
      if (!touch) {
        setIdle();
        return;
      }

      if (!start.dragging) {
        setIdle();
        return;
      }

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const signed = start.direction === "prev" ? dx : -dx;

      if (Math.abs(dx) < Math.abs(dy) * 1.1) {
        setIdle();
        return;
      }

      const durationMs = performance.now() - start.t;
      if (swipeMeetsVelocityOrDistance(signed, durationMs, thresholdPx)) {
        hapticLight();
        onViewChangeRef.current(start.targetView);
      }
      setIdle();
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", (e) => onEnd(e, false), { passive: true });
    el.addEventListener("touchcancel", (e) => onEnd(e, true), { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", (e) => onEnd(e, false));
      el.removeEventListener("touchcancel", (e) => onEnd(e, true));
      if (rafHintRef.current != null) cancelAnimationFrame(rafHintRef.current);
      setIdle();
    };
  }, [enabled, targetElement, getTarget, edgeInsetPx, thresholdPx]);

  useEffect(() => {
    if (!enabled) onHintRef.current?.({ phase: "idle" });
  }, [enabled]);
}
