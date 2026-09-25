"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
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
  /** When false, only backdrop + panel chrome (e.g. child supplies its own header). */
  showHeader?: boolean;
  /** Let flex children fill height (route panels, long forms). */
  flexBody?: boolean;
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
}: SheetProps) {
  const trapRef = useFocusTrap(open);

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
      ? "fixed inset-x-0 bottom-0 z-[70] flex max-h-[min(92dvh,920px)] flex-col rounded-t-[2rem] border border-slate-200 bg-white shadow-2xl"
      : "fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl";

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fechar painel"
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={showHeader ? "sheet-title" : undefined}
        aria-label={showHeader ? undefined : title}
        className={cn(panelClass, className)}
        style={{ paddingBottom: side === "bottom" ? "max(0.5rem, env(safe-area-inset-bottom))" : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        {side === "bottom" && (
          <div className="flex shrink-0 justify-center pt-3 pb-1" aria-hidden>
            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
          </div>
        )}
        {showHeader ? (
          <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-4 pb-4 pt-1">
            <div className="min-w-0 pr-3">
              <h2 id="sheet-title" className="text-base font-black uppercase tracking-tight text-slate-900">
                {title}
              </h2>
              {description && <p className="mt-1 text-xs font-semibold text-slate-600">{description}</p>}
            </div>
            <IconButton aria-label="Fechar painel" variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </IconButton>
          </div>
        ) : null}
        <div
          className={cn(
            "min-h-0 flex-1",
            flexBody ? "flex flex-col overflow-hidden" : "overflow-y-auto"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
