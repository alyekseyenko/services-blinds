"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { setMeasurementSheetPrintedAction } from "@/actions/measurements-actions";
import { useToast } from "@/components/ui/ToastContext";
import {
  formatMeasurementPrintLabel,
  isMeasurementSheetPrinted,
} from "@/lib/measurements/printStatus";

export function MeasurementSheetPrintMark(props: {
  sheetId: string;
  printedAtIso?: string;
  printedByName?: string;
  canMark: boolean;
  onUpdated: () => void;
}) {
  const toast = useToast();
  const printed = isMeasurementSheetPrinted(props.printedAtIso);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (!props.canMark) return;
    setSaving(true);
    const next = !printed;
    const result = await setMeasurementSheetPrintedAction(props.sheetId, next);
    setSaving(false);
    if (!result.success) {
      toast.error("Impressão", result.error || "Não foi possível guardar.");
      return;
    }
    toast.success(
      next ? "Marcada como impressa" : "Marcada como por imprimir",
      "O estado ficou guardado na base de dados das medições."
    );
    props.onUpdated();
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-muted">
          <Printer className="h-5 w-5 text-primary-ink" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Impressão
          </p>
          <p className="text-sm font-bold text-foreground">
            {formatMeasurementPrintLabel(props.printedAtIso, props.printedByName)}
          </p>
        </div>
      </div>
      {props.canMark ? (
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={saving}
          className={`flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 px-4 text-sm font-black disabled:opacity-50 ${
            printed
              ? "border-border bg-muted text-foreground"
              : "border-success-border bg-success-surface text-success-fg"
          }`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {printed ? "Marcar como por imprimir" : "Marcar como impressa"}
        </button>
      ) : null}
    </div>
  );
}
