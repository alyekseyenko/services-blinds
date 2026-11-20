"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { ADMIN_TOOLBAR_GLYPH } from "@/components/admin/header/adminHeaderToolbar";

export function AdminSyncChip({
  isSyncing,
  syncDataStale,
  syncLabel,
  onRefresh,
  onLoadMapServices,
  loading,
  className,
  dataTour,
  fullWidth,
}: {
  isSyncing: boolean;
  syncDataStale?: boolean;
  syncLabel: string;
  onRefresh: () => void;
  onLoadMapServices?: () => void;
  loading: boolean;
  className?: string;
  dataTour?: string;
  fullWidth?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen]);

  const run = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <div ref={menuRef} className={cn("relative", fullWidth && "w-full", className)}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        disabled={loading || isSyncing}
        data-tour={dataTour}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className={cn(
          "flex min-h-12 w-full items-center gap-2 rounded-xl border-2 px-2.5 py-1.5 text-left transition-all disabled:opacity-60 md:min-h-10 md:px-3",
          fullWidth ? "max-w-none" : "max-w-[12rem]",
          isSyncing
            ? "border-warning-border bg-warning-surface text-warning-fg"
            : syncDataStale
              ? "border-danger-border bg-danger-surface text-danger-fg"
              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
        )}
        title="Sincronizar"
        aria-label="Sincronizar"
      >
        <RefreshCw
          className={cn(ADMIN_TOOLBAR_GLYPH, isSyncing ? "animate-spin text-warning-solid" : "")}
          strokeWidth={2}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight">
          {isSyncing ? "A sincronizar…" : syncLabel}
        </span>
      </button>
      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 flex w-72 max-w-[calc(100vw-1.5rem)] flex-col gap-2 rounded-xl border-2 border-border-strong bg-card p-2 shadow-none"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => run(onRefresh)}
            className="min-h-12 rounded-lg border-2 border-border bg-card px-3 text-left text-xs font-bold text-foreground hover:border-border-strong"
          >
            Carregar novos dados do CRM
          </button>
          {onLoadMapServices ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onLoadMapServices)}
              className="min-h-12 rounded-lg border-2 border-border bg-card px-3 text-left text-xs font-bold text-foreground hover:border-border-strong"
            >
              Carregar novos serviços para o mapa
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}