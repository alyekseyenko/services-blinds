import { useCallback, useEffect, useId, useRef } from "react";

/**
 * Maps Android back / browser back to closing an overlay without leaving the route.
 */
export function useBackToClose(open: boolean, onClose: () => void, overlayKey?: string) {
  const autoId = useId();
  const key = overlayKey ?? autoId;
  const onCloseRef = useRef(onClose);
  const pushedRef = useRef(false);
  const ignorePopRef = useRef(false);
  const skipHistoryBackRef = useRef(false);

  onCloseRef.current = onClose;

  const dismissForNavigation = useCallback(() => {
    skipHistoryBackRef.current = true;
    onCloseRef.current();
  }, []);

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
      // A nested sheet (serviço extra) also pushes history. Closing it calls
      // history.back(), which must not close the visit drawer still underneath.
      if (window.history.state?.__fieldopsOverlay === key) return;
      pushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (pushedRef.current && !skipHistoryBackRef.current) {
        ignorePopRef.current = true;
        pushedRef.current = false;
        window.history.back();
      }
      skipHistoryBackRef.current = false;
    };
  }, [open, key]);

  /** Evita `history.back()` no cleanup sem chamar `onClose` (ex.: fechar overlay e navegar noutro sítio). */
  const dismissWithoutHistoryBack = useCallback(() => {
    skipHistoryBackRef.current = true;
  }, []);

  return { dismissForNavigation, dismissWithoutHistoryBack };
}
