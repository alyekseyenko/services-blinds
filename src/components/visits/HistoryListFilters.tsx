"use client";

import { Filter, X } from "lucide-react";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import { cn } from "@/lib/cn";
import {
  HISTORY_DATE_PRESET_OPTIONS,
  HISTORY_OUTCOME_OPTIONS,
  type HistoryDatePreset,
} from "@/lib/visits/historyFilters";
import { Input } from "@/components/ui/input";

export interface HistoryListFiltersProps {
  datePreset: HistoryDatePreset;
  onDatePresetChange: (preset: HistoryDatePreset) => void;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  outcomes: readonly MapHistoryOutcome[];
  onToggleOutcome: (outcome: MapHistoryOutcome) => void;
  onClear: () => void;
  resultCount?: number;
  totalCount?: number;
}

function outcomeTone(value: MapHistoryOutcome, selected: boolean): string {
  if (value === "completed") {
    return selected
      ? "border-success-solid bg-success-surface text-success-fg"
      : "border-border bg-card text-muted-foreground";
  }
  if (value === "incomplete") {
    return selected
      ? "border-warning-solid bg-warning-surface text-warning-fg"
      : "border-border bg-card text-muted-foreground";
  }
  return selected
    ? "border-danger-solid bg-danger-surface text-danger-fg"
    : "border-border bg-card text-muted-foreground";
}

export function HistoryListFilters({
  datePreset,
  onDatePresetChange,
  from,
  to,
  onFromChange,
  onToChange,
  outcomes,
  onToggleOutcome,
  onClear,
  resultCount,
  totalCount,
}: HistoryListFiltersProps) {
  const showFrom = datePreset === "from" || datePreset === "between";
  const showTo = datePreset === "between";
  const hasActive =
    datePreset !== "all" || outcomes.length > 0 || Boolean(from) || Boolean(to);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-muted-foreground">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          Filtrar
        </p>
        {hasActive ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Limpar
          </button>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Período"
        className="flex gap-1 overflow-x-auto rounded-xl border-2 border-border-strong bg-muted p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {HISTORY_DATE_PRESET_OPTIONS.map((opt) => {
          const active = datePreset === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onDatePresetChange(opt.value)}
              className={cn(
                "min-h-12 shrink-0 rounded-lg px-3 text-xs font-black uppercase tracking-wider",
                active
                  ? "bg-neon text-neon-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {showFrom || showTo ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {showFrom ? (
            <Input
              type="date"
              label={datePreset === "from" ? "Desde" : "De"}
              value={from}
              onChange={(event) => onFromChange(event.target.value)}
            />
          ) : null}
          {showTo ? (
            <Input
              type="date"
              label="Até"
              value={to}
              onChange={(event) => onToChange(event.target.value)}
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-1.5">
        {HISTORY_OUTCOME_OPTIONS.map((item) => {
          const selected = outcomes.includes(item.value);
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onToggleOutcome(item.value)}
              className={cn(
                "min-h-12 rounded-xl border px-1 py-2 text-xs font-black uppercase tracking-wide",
                outcomeTone(item.value, selected)
              )}
              aria-pressed={selected}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {typeof resultCount === "number" ? (
        <p className="text-xs font-semibold text-muted-foreground">
          {typeof totalCount === "number" && resultCount !== totalCount
            ? `${resultCount} de ${totalCount} ${totalCount === 1 ? "registo" : "registos"}`
            : `${resultCount} ${resultCount === 1 ? "registo" : "registos"}`}
        </p>
      ) : null}
    </div>
  );
}
