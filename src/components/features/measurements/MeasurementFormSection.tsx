"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SectionStatusBadge } from "@/lib/measurements/groupFormSectionMeta";

const BADGE_CLASS: Record<SectionStatusBadge["tone"], string> = {
  success: "ds-chip-success",
  warning: "ds-chip-warning",
  neutral: "ds-chip-neutral",
};

type Props = {
  step: 1 | 2 | 3;
  title: string;
  description: string;
  summary?: string;
  statusBadge?: SectionStatusBadge;
  children: ReactNode;
  /** Quando false, só renderiza o conteúdo (ex.: ficha só leitura no admin). */
  enabled?: boolean;
  collapsible?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export function MeasurementFormSection({
  step,
  title,
  description,
  summary,
  statusBadge,
  children,
  enabled = true,
  collapsible = false,
  open = true,
  onOpenChange,
  className,
}: Props) {
  if (!enabled) {
    return <>{children}</>;
  }

  const isOpen = !collapsible || open;

  const toggle = () => {
    if (collapsible) onOpenChange?.(!open);
  };

  return (
    <section
      className={cn("overflow-hidden rounded-2xl border-2 border-border-strong bg-muted", className)}
      aria-labelledby={`measurement-section-${step}-title`}
    >
      <div
        className={cn(
          "flex items-start gap-3 border-b border-border bg-card px-3 py-3",
          collapsible && "cursor-pointer select-none"
        )}
        onClick={toggle}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              }
            : undefined
        }
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-primary bg-primary-surface text-sm font-black text-primary-ink"
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h5 id={`measurement-section-${step}-title`} className="text-sm font-black text-foreground">
            {title}
          </h5>
          <p className="mt-0.5 text-xs font-medium leading-snug text-muted-foreground">{description}</p>
          {summary ? (
            <p className="mt-1.5 truncate text-xs font-bold text-foreground" title={summary}>
              {summary}
            </p>
          ) : null}
        </div>
        {statusBadge ? (
          <span
            className={cn(
              "mt-1 shrink-0 max-w-[9rem] truncate text-center",
              BADGE_CLASS[statusBadge.tone]
            )}
            title={statusBadge.label}
          >
            {statusBadge.label}
          </span>
        ) : null}
        {collapsible ? (
          <ChevronDown
            className={cn(
              "mt-2 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
            aria-hidden
          />
        ) : null}
      </div>
      {isOpen ? <div className="space-y-3 p-3">{children}</div> : null}
    </section>
  );
}
