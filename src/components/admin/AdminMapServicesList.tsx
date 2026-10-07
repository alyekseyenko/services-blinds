"use client";

import { useMemo } from "react";
import { Calendar, Loader2, MapPin, MapPinOff, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canAdminScheduleOpportunity } from "@/lib/admin/mapScheduleEligibility";
import { sortMapServicesForList } from "@/lib/admin/mapServicesListSort";
import { getServiceTypeColor, resolveServiceType } from "@/lib/techniciansConfig";
import { isTaskInProgress } from "@/lib/crm/contract";
import { isOpportunityPendingTechnicianClosure } from "@/lib/visitPendingClosure";
import type { Opportunity } from "@/types/admin";

type Props = {
  opportunities: Opportunity[];
  mapTab: string;
  loading: boolean;
  onSelect: (opp: Opportunity) => void;
  onSchedule: (opp: Opportunity) => void;
};

export default function AdminMapServicesList({
  opportunities,
  mapTab,
  loading,
  onSelect,
  onSchedule,
}: Props) {
  const sorted = useMemo(
    () => sortMapServicesForList(opportunities, mapTab),
    [opportunities, mapTab]
  );

  if (loading) {
    return (
      <div className="flex min-h-48 flex-1 items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        A carregar serviços…
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-bold text-foreground">Nenhum serviço com estes filtros.</p>
        <p className="max-w-sm text-xs font-medium text-muted-foreground">
          Ajuste o estado (por agendar / agendados) ou o tipo de serviço nos filtros.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-3 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:grid-cols-2 lg:gap-4 lg:p-5"
      data-tour="admin-map-services-list"
    >
      {sorted.map((opp) => {
        const serviceType = resolveServiceType(opp);
        const typeColors = getServiceTypeColor(serviceType || "GERAL");
        const canSchedule = canAdminScheduleOpportunity(opp);
        const scheduledLabel =
          opp.scheduledAt &&
          new Date(opp.scheduledAt).toLocaleString("pt-PT", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
        const hasGps = Boolean(opp.coordinates?.length === 2);
        const pendingClosure = isOpportunityPendingTechnicianClosure(opp);

        return (
          <li key={opp.twentyId || opp.id}>
            <article
              className="flex h-full flex-col rounded-2xl border-2 border-border bg-card p-3 shadow-sm transition-colors hover:border-border-strong lg:rounded-[1.25rem] lg:p-4"
            >
              <div className="flex flex-wrap items-start gap-2">
                <span
                  className="rounded-md border px-2 py-0.5 text-xs font-bold uppercase"
                  style={{
                    backgroundColor: typeColors.bg,
                    color: typeColors.text,
                    borderColor: `${typeColors.text}30`,
                  }}
                >
                  {typeColors.label}
                </span>
                {opp.delayAlert === "red" && (
                  <span className="rounded-md bg-danger-solid px-2 py-0.5 text-xs font-black uppercase text-ink-foreground">
                    +30 dias
                  </span>
                )}
                {opp.delayAlert === "orange" && (
                  <span className="rounded-md bg-warning-solid px-2 py-0.5 text-xs font-black uppercase text-primary-foreground">
                    +14 dias
                  </span>
                )}
                {isTaskInProgress(opp.taskStatus) && (
                  <span className="rounded-md border border-warning-border bg-warning-surface px-2 py-0.5 text-xs font-black uppercase text-warning-fg">
                    Em curso
                  </span>
                )}
                {pendingClosure && (
                  <span className="rounded-md border border-danger-border bg-danger-surface px-2 py-0.5 text-xs font-black uppercase text-danger-fg">
                    Por fechar
                  </span>
                )}
                {!hasGps && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                    <MapPinOff className="h-3 w-3" aria-hidden />
                    Sem GPS
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSelect(opp)}
                className="mt-2 w-full text-left"
              >
                <p className="text-sm font-black text-foreground line-clamp-2">
                  {opp.client || opp.title || "Cliente"}
                </p>
                <p className="mt-0.5 text-xs font-bold text-muted-foreground line-clamp-2">
                  {[
                    opp.title && opp.title !== opp.client ? opp.title : null,
                    opp.addressCity,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Serviço"}
                </p>
                <p className="mt-1 flex items-start gap-1 text-xs font-medium text-muted-foreground line-clamp-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {opp.address || "Morada não indicada"}
                </p>
                {scheduledLabel ? (
                  <p className="mt-1 text-xs font-bold text-success-fg">
                    Visita: {scheduledLabel}
                    {opp.technician ? ` · ${opp.technician}` : ""}
                  </p>
                ) : null}
              </button>

              <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 flex-1 font-bold"
                  onClick={() => onSelect(opp)}
                >
                  <PanelRightOpen className="h-4 w-4" aria-hidden />
                  Abrir painel
                </Button>
                {canSchedule ? (
                  <Button
                    type="button"
                    className="min-h-12 flex-1 font-bold"
                    onClick={() => onSchedule(opp)}
                  >
                    <Calendar className="h-4 w-4" aria-hidden />
                    Agendar
                  </Button>
                ) : null}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
