"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type AutoResetErrorPanelProps = {
  title: string;
  message: string;
  reset: () => void;
  resetSeconds?: number;
};

export function AutoResetErrorPanel({
  title,
  message,
  reset,
  resetSeconds = 60,
}: AutoResetErrorPanelProps) {
  useEffect(() => {
    const id = window.setTimeout(() => reset(), resetSeconds * 1000);
    return () => clearTimeout(id);
  }, [reset, resetSeconds]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="ds-title text-lg tracking-tight text-foreground">
        {title}
      </h2>
      <p className="max-w-md text-sm font-semibold text-muted-foreground dark:text-muted-foreground">{message}</p>
      <Button type="button" onClick={reset}>
        Tentar novamente
      </Button>
      <p className="text-xs text-muted-foreground">
        A página será recarregada automaticamente em {resetSeconds} segundos.
      </p>
    </div>
  );
}
