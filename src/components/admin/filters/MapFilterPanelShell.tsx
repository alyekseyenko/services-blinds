"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export type PanelPlacement = "dropdown" | "dock";

export function MapFilterPanelShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  placement = "dropdown",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  placement?: PanelPlacement;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      className={cn(
        "flex max-h-[min(50vh,28rem)] flex-col overflow-hidden rounded-2xl border-2 border-border-strong bg-card shadow-lg",
        placement === "dropdown" &&
          "absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[calc(100vw-1.5rem)] max-h-[min(68dvh,32rem)] sm:w-[28rem] lg:w-[32rem]",
        placement === "dock" && "relative z-30 mt-1 w-full max-h-[min(55vh,32rem)]"
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-foreground">{title}</p>
          {subtitle && <p className="text-xs font-medium text-muted-foreground">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">{children}</div>
      {footer && <div className="shrink-0 border-t border-border p-3">{footer}</div>}
    </div>
  );
}