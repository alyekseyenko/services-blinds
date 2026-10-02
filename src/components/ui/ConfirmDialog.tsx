"use client";

import React, { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);
  const trapRef = useFocusTrap(open);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const close = (result: boolean) => {
    setOpen(false);
    resolver?.(result);
    setResolver(null);
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && options && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-scrim p-4"
          role="presentation"
          onClick={() => close(false)}
        >
          <div
            ref={trapRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby={options.description ? "confirm-dialog-desc" : undefined}
            className="w-full max-w-md rounded-2xl border-2 border-border-strong bg-card p-6"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") close(false);
            }}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-xl bg-warning-surface p-2 text-warning-solid">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="confirm-dialog-title" className="ds-title text-base tracking-tight text-foreground">
                  {options.title}
                </h2>
                {options.description && (
                  <p id="confirm-dialog-desc" className="mt-2 text-sm font-semibold text-muted-foreground">
                    {options.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" size="md" onClick={() => close(false)} className="min-h-12">
                {options.cancelLabel || "Cancelar"}
              </Button>
              <Button
                variant={options.destructive ? "destructive" : "primary"}
                size="md"
                onClick={() => close(true)}
                className="min-h-12"
              >
                {options.confirmLabel || "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}
