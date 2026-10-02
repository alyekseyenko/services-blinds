import { useEffect, useId, useRef } from "react";

/**
 * Maps Android back / browser back to closing an overlay without leaving the route.
 */
export function useBackToClose(open: boolean, onClose: () => void, overlayKey?: string) {
  const autoId = useId();
  const key = overlayKey ?? autoId;
  const onCloseRef = useRef(onClose);
  const pushedRef = useRef(false);
  const ignorePopRef = useRef(false);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const state = { __fieldopsOverlay: key };
    window.history.pushState(state, "");
    pushedRef.current = true;

    const onPop = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        return;
      }
      pushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (pushedRef.current) {
        ignorePopRef.current = true;
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, [open, key]);
}
