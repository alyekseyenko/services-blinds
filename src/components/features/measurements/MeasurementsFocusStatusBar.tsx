"use client";

import { cn } from "@/lib/cn";

export type MeasurementsFocusedStatus = {
  progressSummary: string;
  draftLabel: string | null;
  draftTone: "success" | "warning" | null;
};

type Props = MeasurementsFocusedStatus & {
  className?: string;
};

export function MeasurementsFocusStatusBar({
  progressSummary,
  draftLabel,
  draftTone,
  className,
}: Props) {
  if (!progressSummary && !draftLabel) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-border bg-muted/70 px-3 py-2",
        className
      )}
      data-tour="tech-measurements-progress"
    >
      <p className="min-w-0 flex-1 text-xs font-bold leading-snug text-foreground">
        {progressSummary}
      </p>
      {draftLabel ? (
        <p
          className={cn(
            "shrink-0 text-xs font-bold",
            draftTone === "success" ? "text-success-fg" : "text-warning-solid"
          )}
          data-tour="tech-measurements-draft-status"
        >
          {draftLabel}
        </p>
      ) : null}
    </div>
  );
}
