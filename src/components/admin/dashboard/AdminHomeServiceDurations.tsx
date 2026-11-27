"use client";

import { Clock } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import type { ServiceTypeDurationAverage } from "@/lib/visits/onSiteDurationStats";
import type { AdminViewId } from "@/components/admin/AdminPrimaryNav";

type Props = {
  rows: ServiceTypeDurationAverage[];
  onNavigate: (view: AdminViewId) => void;
};

export function AdminHomeServiceDurations({ rows, onNavigate }: Props) {
  if (rows.length === 0) return null;

  return (
    <section aria-label="Tempo médio por serviço">
      <div className="mb-4">
        <h2 className="ds-kicker">Tempo médio por serviço</h2>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          Chegada → fecho na app. Só tipos com pelo menos 3 visitas concluídas.
        </p>
      </div>
      <Panel
        variant="outline"
        className="overflow-hidden rounded-2xl border-2 border-border-strong p-0 shadow-none"
      >
        <ul className="divide-y-2 divide-border">
          {rows.map((row) => (
            <li
              key={row.serviceType}
              className="flex min-h-12 items-center justify-between gap-3 px-4 py-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-info-solid" aria-hidden />
                <span className="truncate text-sm font-bold text-foreground">{row.serviceLabel}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="ds-num block text-sm font-black text-foreground">{row.formattedAvg}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {row.sampleCount} visitas
                </span>
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onNavigate("history")}
          className="flex min-h-12 w-full items-center justify-center border-t-2 border-border text-xs font-bold text-foreground"
        >
          Ver no histórico
        </button>
      </Panel>
    </section>
  );
}
