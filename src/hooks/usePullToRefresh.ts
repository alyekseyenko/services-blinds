import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;
  threshold?: number;
}

export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 72,
}: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const refreshing = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing.current) return;
      startY.current = e.touches[0].clientY;
      setPulling(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling || refreshing.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY <= 0) {
        setPullDistance(Math.min(delta, threshold * 1.5));
        if (delta > 10) e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (!pulling) return;
      setPulling(false);
      if (pullDistance >= threshold && !refreshing.current) {
        refreshing.current = true;
        try {
          await onRefresh();
        } finally {
          refreshing.current = false;
        }
      }
      setPullDistance(0);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, onRefresh, pullDistance, pulling, threshold]);

  return { pullDistance, isPulling: pulling && pullDistance > 0 };
}
