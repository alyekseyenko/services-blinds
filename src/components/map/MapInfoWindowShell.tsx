"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface MapInfoWindowShellProps {
  onClose: () => void;
  children: ReactNode;
  /** Wider popups (e.g. technician itinerary). */
  wide?: boolean;
  /** Ancora do guia de onboarding no popup de exemplo. */
  dataTour?: string;
}

export function MapInfoWindowShell({ onClose, children, wide, dataTour }: MapInfoWindowShellProps) {
  return (
    <div
      data-tour={dataTour}
      className={cn(
        "map-info-window-content overflow-hidden rounded-2xl border-2 border-border-strong bg-card font-sans text-card-foreground shadow-none",
        wide
          ? "min-w-[min(260px,calc(100vw-4rem))] max-w-[300px]"
          : "min-w-[min(240px,calc(100vw-4rem))] max-w-[280px]"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b-2 border-border-strong bg-muted px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 bg-primary" aria-hidden />
          <span className="ds-kicker truncate text-muted-foreground">Resumo</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex h-10 w-10 min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-lg border-2 border-border-strong bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="px-3 py-2.5 text-sm">{children}</div>
    </div>
  );
}
