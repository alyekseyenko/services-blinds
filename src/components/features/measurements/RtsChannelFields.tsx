"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { formatStoreChannelDisplay } from "@/lib/measurements/extendedFields";
import {
  rtsChannelOptions,
  rtsCommandMaxChannel,
  type RtsCommandSpec,
} from "@/lib/measurements/rtsCommands";
import {
  analyzeRtsChannelUsage,
  formatRtsCommandSelectLabel,
  getRtsRowChannelWarning,
  rtsChannelSelectOptions,
} from "@/lib/measurements/rtsChannelUsage";
import type { MeasurementRow } from "@/types";

const selectClass =
  "w-full min-h-12 rounded-xl border-2 border-border-strong bg-card px-2 text-sm font-black text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:bg-muted disabled:text-muted-foreground";

const selectWarningClass =
  "border-warning-solid focus:border-warning-solid focus:ring-warning-solid/25";

type Props = {
  row: MeasurementRow;
  rowIndex: number;
  allRows: MeasurementRow[];
  specs: RtsCommandSpec[];
  locked: boolean;
  onUpdate: (field: "storeCommand" | "storeChannel", value: string) => void;
  /** Célula da tabela (desktop): sem rótulos visíveis. */
  compact?: boolean;
};

export function RtsChannelFields({
  row,
  rowIndex,
  allRows,
  specs,
  locked,
  onUpdate,
  compact = false,
}: Props) {
  const command = row.storeCommand?.trim() ?? "";
  const channel = row.storeChannel?.trim() ?? "";
  const spec = specs.find((s) => String(s.index) === command);
  const channelOptions = rtsChannelOptions(spec);
  const legacyOther = row.storeChannelOther?.trim();

  const usage = useMemo(() => analyzeRtsChannelUsage(specs, allRows), [specs, allRows]);
  const rowWarning = locked ? null : getRtsRowChannelWarning(rowIndex, row, specs, usage);
  const channelSelectOptions = useMemo(
    () => rtsChannelSelectOptions(spec, rowIndex, usage),
    [spec, rowIndex, usage]
  );

  if (locked) {
    const label = formatStoreChannelDisplay(channel, legacyOther, command);
    return (
      <div className={cn("min-w-0 space-y-1", !compact && "flex-1")}>
        {!compact ? (
          <span className="px-1 text-sm font-bold text-muted-foreground">Comando e canal</span>
        ) : null}
        <div className="min-h-12 rounded-xl border border-border bg-card p-3 text-sm font-black text-foreground">
          {label || "-"}
        </div>
      </div>
    );
  }

  const pickCommand = (next: string) => {
    onUpdate("storeCommand", next);
    const nextSpec = specs.find((s) => String(s.index) === next);
    const max = rtsCommandMaxChannel(nextSpec);
    if (!next) onUpdate("storeChannel", "");
    else if (max === 1) onUpdate("storeChannel", "1");
    else if (max > 0 && Number(channel) > max) onUpdate("storeChannel", "");
  };

  const channelHint = !command
    ? "Escolha o comando"
    : spec?.mode === "VARIOS_CANAIS" && !spec.channelCount
      ? "Indique os canais do comando"
      : !spec?.mode
        ? "Defina o comando no produto"
        : "Canal…";

  if (specs.length === 0) {
    return (
      <div className={cn("min-w-0 space-y-1", !compact && "flex-1")}>
        {!compact ? (
          <span className="px-1 text-sm font-bold text-muted-foreground">Comando e canal</span>
        ) : null}
        <p className="rounded-xl border-2 border-dashed border-border p-3 text-xs font-bold text-muted-foreground">
          Indique a quantidade de comandos RTS no produto.
        </p>
      </div>
    );
  }

  const showFieldWarning = Boolean(rowWarning);

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", compact ? "" : "flex-1")}>
      <div className={cn("flex min-w-0 gap-2", compact ? "flex-col" : "flex-wrap")}>
        <div className={cn("space-y-1", compact ? "w-full" : "min-w-[8rem] flex-1")}>
          {!compact ? (
            <label className="px-1 text-sm font-bold text-muted-foreground">Comando</label>
          ) : null}
          <select
            className={cn(selectClass, showFieldWarning && selectWarningClass)}
            aria-label="Comando do estore"
            value={command}
            onChange={(e) => pickCommand(e.target.value)}
          >
            <option value="">Comando…</option>
            {specs.map((s) => (
              <option key={s.index} value={String(s.index)}>
                {formatRtsCommandSelectLabel(s, usage)}
              </option>
            ))}
          </select>
        </div>
        <div className={cn("space-y-1", compact ? "w-full" : "min-w-[8rem] flex-1")}>
          {!compact ? (
            <label className="px-1 text-sm font-bold text-muted-foreground">Canal</label>
          ) : null}
          <select
            className={cn(selectClass, showFieldWarning && selectWarningClass)}
            aria-label="Canal do estore"
            value={channelOptions.includes(Number(channel)) ? channel : ""}
            disabled={channelOptions.length === 0}
            onChange={(e) => onUpdate("storeChannel", e.target.value)}
          >
            <option value="">{channelHint}</option>
            {channelSelectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {rowWarning ? (
        <p className="rounded-lg border border-warning-border bg-warning-surface px-2 py-1.5 text-xs font-bold text-warning-fg">
          {rowWarning}
        </p>
      ) : null}
      {legacyOther ? (
        <p className="w-full px-1 text-xs font-bold text-muted-foreground">
          Nota antiga: {legacyOther}
        </p>
      ) : null}
    </div>
  );
}
