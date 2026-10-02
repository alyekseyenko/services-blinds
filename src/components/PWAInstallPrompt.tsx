"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isPwaInstallSuppressed,
  markPwaInstallDismissed,
  markPwaInstalled,
} from "@/lib/clientPreferences";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isPwaInstallSuppressed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      if (isPwaInstallSuppressed()) return;
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      markPwaInstalled();
      setVisible(false);
    }
    setDeferred(null);
  };

  const dismiss = () => {
    markPwaInstallDismissed();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] left-4 right-4 z-[90] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl lg:bottom-6 lg:left-auto lg:right-6"
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2 text-neon">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black uppercase tracking-tight text-foreground">Instalar aplicação</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Adicione ao ecrã inicial para acesso rápido em campo.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>Instalar</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>Agora não</Button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
