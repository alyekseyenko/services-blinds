"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SWUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(installing);
          }
        });
      });
    });

    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  const reload = () => {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  };

  if (!waitingWorker) return null;

  return (
    <div
      className="fixed left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-[9990] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-[#84cc16]/40 bg-[#090d16] p-4 text-white shadow-xl"
      role="status"
    >
      <p className="text-xs font-black uppercase tracking-wider">Nova versão disponível</p>
      <Button size="sm" onClick={reload}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Recarregar
      </Button>
    </div>
  );
}
