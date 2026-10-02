"use client";

import type { AgendaDiffKind } from "@/lib/agendaDiff";
import { AGENDA_KIND_LABEL_PT } from "@/lib/agendaNotificationBellCopy";
import { cn } from "@/lib/cn";
import { Check } from "lucide-react";

type AgendaNotificationProgressTrailProps = {
  trail: AgendaDiffKind[];
  currentKind?: AgendaDiffKind;
  compact?: boolean;
};

export function AgendaNotificationProgressTrail({
  trail,
  currentKind,
  compact = false,
}: AgendaNotificationProgressTrailProps) {
  if (trail.length <= 1) return null;

  const activeKind = currentKind ?? trail[trail.length - 1];

  return (
    <ol
      className={cn("flex flex-wrap items-center gap-1.5", compact ? "mt-2" : "mt-3")}
      aria-label="Progresso da visita"
    >
      {trail.map((kind, index) => {
        const isLast = index === trail.length - 1;
        const isActive = isLast && kind === activeKind;
        const isPast = !isLast;
        const label = AGENDA_KIND_LABEL_PT[kind] ?? kind;

        return (
          <li key={`${kind}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && (
              <span className="text-muted-foreground dark:text-muted-foreground/50" aria-hidden>
                →
              </span>
            )}
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                isActive &&
                  "border-primary/60 bg-primary/15 text-primary-ink dark:text-primary-ink",
                isPast &&
                  "border-border/90 bg-muted text-muted-foreground dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
                !isActive &&
                  !isPast &&
                  "border-border bg-card text-muted-foreground dark:border-border dark:bg-card"
              )}
            >
              {isPast ? (
                <Check className="h-3 w-3 shrink-0 text-neon" aria-hidden />
              ) : (
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    isActive ? "bg-primary shadow-[0_0_6px_var(--primary)]" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
              <span className="truncate">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
