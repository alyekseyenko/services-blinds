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
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  side = "bottom",
  className = "",
}: SheetProps) {
  const trapRef = useFocusTrap(open);

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
      ? "fixed inset-x-0 bottom-0 z-[70] flex max-h-[85vh] flex-col rounded-t-[2rem] border border-slate-200 bg-white shadow-2xl"
      : "fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl";

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className={cn(panelClass, className)}
        style={{ paddingBottom: side === "bottom" ? "max(1rem, env(safe-area-inset-bottom))" : undefined }}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 p-4">
          <div>
            <h2 id="sheet-title" className="text-base font-black uppercase tracking-tight text-slate-900">
              {title}
            </h2>
            {description && <p className="mt-1 text-xs font-semibold text-slate-600">{description}</p>}
          </div>
          <IconButton aria-label="Fechar painel" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
