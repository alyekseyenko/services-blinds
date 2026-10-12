"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FieldContrastToggle } from "@/components/ui/FieldContrastToggle";
import { useBackToClose } from "@/hooks/useBackToClose";
import { cn } from "@/lib/cn";

type AppearanceMenuProps = {
  /** Barra do técnico (md+): um botão com painel. */
  layout: "toolbar" | "sheet-rows";
};

export function AppearanceMenu({ layout }: AppearanceMenuProps) {
  const [open, setOpen] = useState(false);

  useBackToClose(open, () => setOpen(false), "appearance-menu");

  if (layout === "sheet-rows") {
    return (
      <>
        <li className="flex min-h-14 items-center rounded-2xl border border-border bg-card px-4 py-2">
          <FieldContrastToggle showLabel className="w-full border-0 bg-transparent shadow-none" />
        </li>
        <li className="flex min-h-14 items-center rounded-2xl border border-border bg-card px-4 py-2">
          <ThemeToggle showLabel className="w-full border-0 bg-transparent shadow-none" />
        </li>
      </>
    );
  }

  return (
    <div className="relative">
      <IconButton
        onClick={() => setOpen((v) => !v)}
        aria-label="Aparência e contraste"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-tour="tech-appearance-menu"
        className={open ? "border-primary bg-primary/10 text-primary-ink" : undefined}
      >
        <Palette className="h-5 w-5" aria-hidden />
      </IconButton>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[75] cursor-default bg-transparent"
            aria-label="Fechar menu de aparência"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Aparência"
            className={cn(
              "absolute right-0 top-[calc(100%+0.5rem)] z-[76] w-[min(18rem,calc(100vw-2rem))]",
              "rounded-2xl border-2 border-border bg-card p-3 shadow-lg"
            )}
          >
            <p className="mb-3 px-1 text-xs font-black uppercase tracking-wide text-muted-foreground">
              Aparência
            </p>
            <ul className="space-y-2">
              <li
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2"
              >
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-bold text-foreground">Modo sol</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Alto contraste ao ar livre
                  </span>
                </span>
                <FieldContrastToggle />
              </li>
              <li
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2"
              >
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-bold text-foreground">Tema</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Claro ou escuro
                  </span>
                </span>
                <ThemeToggle />
              </li>
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
