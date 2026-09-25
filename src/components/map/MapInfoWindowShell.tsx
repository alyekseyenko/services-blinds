"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface MapInfoWindowShellProps {
  onClose: () => void;
  children: ReactNode;
  /** Wider popups (e.g. technician itinerary). */
  wide?: boolean;
}

export function MapInfoWindowShell({ onClose, children, wide }: MapInfoWindowShellProps) {
  return (
    <div
      className={cn(
        "map-info-window-content overflow-hidden rounded-xl bg-card font-sans text-card-foreground",
        wide
          ? "min-w-[min(260px,calc(100vw-4rem))] max-w-[300px]"
          : "min-w-[min(240px,calc(100vw-4rem))] max-w-[280px]"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_rgba(132,204,22,0.45)]"
            aria-hidden
          />
          <span className="truncate text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Resumo
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex h-10 w-10 min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="px-3 py-2.5 text-sm">{children}</div>
    </div>
  );
}
