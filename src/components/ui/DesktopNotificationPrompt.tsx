"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  dismissDesktopPrompt,
  requestDesktopNotificationPermission,
  shouldOfferDesktopPrompt,
} from "@/lib/agenda/desktopNotifications";

type DesktopNotificationPromptProps = {
  scope: string;
  className?: string;
};

export function DesktopNotificationPrompt({ scope, className }: DesktopNotificationPromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!scope) {
      setVisible(false);
      return;
    }
    setVisible(shouldOfferDesktopPrompt(scope));
  }, [scope]);

  const handleAllow = useCallback(async () => {
    const result = await requestDesktopNotificationPermission();
    dismissDesktopPrompt(scope);
    setVisible(false);
    if (result === "denied") {
      dismissDesktopPrompt(scope);
    }
  }, [scope]);

  const handleDismiss = useCallback(() => {
    dismissDesktopPrompt(scope);
    setVisible(false);
  }, [scope]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border border-border bg-surface-card p-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className
      )}
      role="region"
      aria-label="Avisos no Windows"
    >
      <div className="flex min-w-0 items-start gap-2">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" aria-hidden />
        <p className="font-semibold text-foreground">
          Quer receber avisos da agenda no Windows quando a app estiver aberta?
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleAllow}
          className="min-h-12 rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-wide text-primary-foreground"
        >
          Permitir
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="min-h-12 rounded-xl border border-border px-4 text-xs font-bold text-muted-foreground"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}