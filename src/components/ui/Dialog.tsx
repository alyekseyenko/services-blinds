"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBackToClose } from "@/hooks/useBackToClose";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** default: card ~32rem; wide: painel largo para formulários de agendamento */
  size?: "default" | "wide";
  /** false: o corpo não faz scroll — útil com colunas e listas com scroll interno */
  scrollBody?: boolean;
  className?: string;
  /** Alvo do guia (admin agendamento) */
  panelDataTour?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "default",
  scrollBody = true,
  className = "",
  panelDataTour,
}: DialogProps) {
  const trapRef = useFocusTrap(open);
  useBackToClose(open, onClose, `dialog-${title}`);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const scheduleTourRoot = panelDataTour === "admin-schedule-modal";

  return (
    <div
      className={cn(
        "fixed inset-0 flex bg-scrim max-sm:items-stretch max-sm:p-0",
        scheduleTourRoot || panelDataTour === "admin-mass-schedule-modal"
          ? "admin-schedule-dialog-root z-[9998]"
          : "z-[9998]",
        size === "wide"
          ? "items-center justify-center p-3 sm:p-5"
          : "items-center justify-center p-4"
      )}
      role="presentation"
      data-tour={
        panelDataTour === "admin-mass-schedule-modal"
          ? "admin-mass-schedule-dialog-root"
          : scheduleTourRoot
            ? "admin-schedule-dialog-root"
            : undefined
      }
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-desc" : undefined}
        className={cn(
          "flex w-full flex-col overflow-hidden border-2 border-border-strong bg-card max-sm:max-h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:border-0",
          size === "wide"
            ? "max-h-[min(92dvh,900px)] max-w-[min(100%,56rem)] rounded-2xl"
            : "max-h-[85dvh] max-w-lg rounded-2xl",
          className
        )}
        data-tour={panelDataTour}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b-2 border-border-strong px-5 py-4 max-sm:pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div>
            <h2 id="dialog-title" className="ds-title text-base tracking-tight text-foreground">
              {title}
            </h2>
            {description && (
              <p id="dialog-desc" className="mt-1 text-sm font-semibold text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <IconButton aria-label="Fechar" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              "min-h-0 flex-1 p-4 sm:p-5",
              scrollBody ? "overflow-y-auto overscroll-contain" : "flex flex-col overflow-hidden"
            )}
          >
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t-2 border-border-strong bg-muted px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
