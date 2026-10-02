"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FIELDOPS_STALE_CLIENT_EVENT } from "@/lib/sync/syncQueuePolicy";

/** Build id baked into this page load (survives reload within same deployment). */
let pageLoadedBuildId: string | null = null;

export default function AppUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [buildStale, setBuildStale] = useState(false);
  const userRequestedReloadRef = useRef(false);

  const checkBuildVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/app-version", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return;
      const { buildId } = (await res.json()) as { buildId?: string };
      if (!buildId) return;

      if (pageLoadedBuildId === null) {
        pageLoadedBuildId = buildId;
        return;
      }
      if (pageLoadedBuildId !== buildId) {
        setBuildStale(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void checkBuildVersion();

    const onStaleClient = () => setBuildStale(true);
    window.addEventListener(FIELDOPS_STALE_CLIENT_EVENT, onStaleClient);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void checkBuildVersion();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener(FIELDOPS_STALE_CLIENT_EVENT, onStaleClient);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkBuildVersion]);

  useVisibleInterval(() => void checkBuildVersion(), 5 * 60 * 1000);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const pingUpdate = () => {
      void navigator.serviceWorker.ready.then((registration) => {
        void registration.update();
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
        }
      });
    };

    pingUpdate();
    const onVisibleSw = () => {
      if (document.visibilityState === "visible") pingUpdate();
    };
    document.addEventListener("visibilitychange", onVisibleSw);

    let updateFoundHandler: (() => void) | null = null;
    let installingStateHandler: (() => void) | null = null;

    void navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
      }

      updateFoundHandler = () => {
        const installing = registration.installing;
        if (!installing) return;
        installingStateHandler = () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(installing);
          }
        };
        installing.addEventListener("statechange", installingStateHandler);
      };
      registration.addEventListener("updatefound", updateFoundHandler);
    });

    const onControllerChange = () => {
      if (userRequestedReloadRef.current) {
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibleSw);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      void navigator.serviceWorker.ready.then((registration) => {
        if (updateFoundHandler) {
          registration.removeEventListener("updatefound", updateFoundHandler);
        }
      });
    };
  }, []);

  const reload = () => {
    userRequestedReloadRef.current = true;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      return;
    }
    window.location.reload();
  };

  const show = Boolean(waitingWorker) || buildStale;
  if (!show) return null;

  return (
    <div
      className="fixed left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-[9990] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-ink p-4 text-ink-foreground shadow-xl"
      role="status"
    >
      <p className="text-xs font-black uppercase tracking-wider leading-snug">
        Nova versão disponível — recarregue para agendar e sincronizar sem erros
      </p>
      <Button size="sm" onClick={reload} className="shrink-0">
        <RefreshCw className="mr-2 h-4 w-4" />
        Recarregar
      </Button>
    </div>
  );
}
