import { useEffect, useRef, useState } from "react";
import { isBrowserOnline } from "@/lib/networkOnline";
import { hapticLight } from "@/lib/haptics";
import { isIgnoredTouchTarget, isInsideDialog } from "@/lib/gestures/touchGuards";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;
  threshold?: number;
  /** Scroll container; when null, listeners are not attached (never document). */
  scrollElement?: HTMLElement | null;
  /** @deprecated Prefer scrollElement — only used when scrollElement is undefined */
  getScrollElement?: () => HTMLElement | null;
  onOfflineAttempt?: () => void;
  /** Element to nudge with translateY (avoids re-render per touchmove). */
  nudgeElement?: HTMLElement | null;
}

export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 72,
  scrollElement,
  getScrollElement,
  onOfflineAttempt,
  nudgeElement,
}: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [armed, setArmed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const startTime = useRef(0);
  const refreshing = useRef(false);
  const pullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const onOfflineAttemptRef = useRef(onOfflineAttempt);

  pullingRef.current = pulling;
  pullDistanceRef.current = pullDistance;
  onRefreshRef.current = onRefresh;
  onOfflineAttemptRef.current = onOfflineAttempt;

  const resolveScrollEl = () => {
    if (scrollElement !== undefined) return scrollElement;
    return getScrollElement?.() ?? null;
  };

  const applyNudge = (distance: number) => {
    const el = nudgeElement;
    if (!el) return;
    const y = distance > 0 ? Math.min(distance * 0.4, 28) : 0;
    el.style.transform = y > 0 ? `translateY(${y}px)` : "";
  };

  const armedRef = useRef(false);
  const lastLabelDistanceRef = useRef(0);

  const syncPullUi = (distance: number) => {
    pullDistanceRef.current = distance;
    const nextArmed = distance >= threshold;
    if (nextArmed !== armedRef.current) {
      armedRef.current = nextArmed;
      setArmed(nextArmed);
    }
    if (Math.abs(distance - lastLabelDistanceRef.current) >= 4 || distance === 0) {
      lastLabelDistanceRef.current = distance;
      setPullDistance(distance);
    }
    applyNudge(distance);
  };

  const resetPull = () => {
    pullingRef.current = false;
    setPulling(false);
    syncPullUi(0);
    setArmed(false);
  };

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const target = resolveScrollEl();
    if (!target) return;

    const scrollTop = () => target.scrollTop;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (isIgnoredTouchTarget(e.target)) return;
      if (isInsideDialog(e.target)) return;
      if (scrollTop() > 0 || refreshing.current) return;
      startY.current = e.touches[0].clientY;
      startTime.current = performance.now();
      pullingRef.current = true;
      setPulling(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || refreshing.current) return;
      if (e.touches.length !== 1) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && scrollTop() <= 0) {
        const nextDistance = Math.min(delta, threshold * 1.5);
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          syncPullUi(nextDistance);
        });
        if (delta > 10) e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      const distance = pullDistanceRef.current;
      pullingRef.current = false;
      setPulling(false);

      if (distance >= threshold && !refreshing.current) {
        if (!isBrowserOnline()) {
          onOfflineAttemptRef.current?.();
          resetPull();
          return;
        }
        hapticLight();
        refreshing.current = true;
        setIsRefreshing(true);
        try {
          await onRefreshRef.current();
        } finally {
          refreshing.current = false;
          setIsRefreshing(false);
        }
      }
      resetPull();
    };

    const onTouchCancel = () => {
      if (!pullingRef.current) return;
      resetPull();
    };

    target.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    target.addEventListener("touchmove", onTouchMove as EventListener, { passive: false });
    target.addEventListener("touchend", onTouchEnd);
    target.addEventListener("touchcancel", onTouchCancel);

    return () => {
      target.removeEventListener("touchstart", onTouchStart as EventListener);
      target.removeEventListener("touchmove", onTouchMove as EventListener);
      target.removeEventListener("touchend", onTouchEnd);
      target.removeEventListener("touchcancel", onTouchCancel);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      applyNudge(0);
    };
  }, [enabled, threshold, scrollElement, getScrollElement, nudgeElement]);

  return {
    pullDistance,
    armed,
    isPulling: pulling && pullDistance > 0,
    isRefreshing,
  };
}
