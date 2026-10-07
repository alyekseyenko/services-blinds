"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBackToClose } from "@/hooks/useBackToClose";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  side?: "bottom" | "right";
  className?: string;
  showHeader?: boolean;
  flexBody?: boolean;
  priority?: "default" | "elevated";
  panelDataTour?: string;
  /** Bottom sheet ocupa o ecrã inteiro (guias, menus longos). */
  fullScreen?: boolean;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  side = "bottom",
  className = "",
  showHeader = true,
  flexBody = false,
  priority = "default",
  panelDataTour,
  fullScreen = false,
}: SheetProps) {
  const trapRef = useFocusTrap(open);
  const [panelEl, setPanelEl] = useState<HTMLElement | null>(null);
  const [handleEl, setHandleEl] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useBackToClose(open, onClose, `sheet-${title}`);

  useSwipeToDismiss({
    enabled: open && side === "bottom",
    onDismiss: onClose,
    handleElement: handleEl,
    panelElement: panelEl,
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const panelClass =
    side === "bottom"
      ? cn(
          "absolute inset-x-0 bottom-0 flex w-full flex-col border-2 border-border-strong bg-card animate-in slide-in-from-bottom duration-200",
          fullScreen
            ? "top-0 max-h-none h-[100dvh] rounded-none border-x-0 border-b-0 safe-top"
            : "max-h-[min(85dvh,720px)] rounded-t-2xl"
        )
      : "absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col border-l-2 border-border-strong bg-card";

  const overlayZ =
    priority === "elevated" ? "z-[1000000020]" : "z-[210]";

  const sheetTree = (
    <div
      className={cn(
        "fixed inset-0",
        side === "bottom" && "flex flex-col justify-end",
        overlayZ
      )}
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-scrim"
        onClick={onClose}
        aria-label="Fechar painel"
      />
      <div
        ref={(node) => {
          trapRef.current = node;
          setPanelEl(node);
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={showHeader ? "sheet-title" : undefined}
        aria-label={showHeader ? undefined : title}
        className={cn(panelClass, className)}
        data-tour={panelDataTour}
        style={{ paddingBottom: side === "bottom" ? "max(0.5rem, env(safe-area-inset-bottom))" : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        {side === "bottom" && (
          <div
            ref={(node) => setHandleEl(node)}
            className="flex min-h-12 shrink-0 cursor-grab touch-manipulation items-center justify-center pt-2 pb-1 active:cursor-grabbing"
            aria-hidden
          >
            <div className="h-1.5 w-12 rounded-full bg-secondary" />
          </div>
        )}
        {showHeader ? (
          <div className="flex shrink-0 items-start justify-between border-b-2 border-border-strong px-4 pb-4 pt-1">
            <div className="min-w-0 pr-3">
              <h2 id="sheet-title" className="ds-title text-base tracking-tight text-foreground">
                {title}
              </h2>
              {description && (
                <p className="mt-1.5 text-xs font-semibold leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <IconButton aria-label="Fechar painel" variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </IconButton>
          </div>
        ) : null}
        <div
          className={cn(
            "min-h-0 flex-1 overscroll-contain",
            flexBody ? "flex flex-col overflow-hidden" : "overflow-y-auto"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") {
    return sheetTree;
  }

  return createPortal(sheetTree, document.body);
}
