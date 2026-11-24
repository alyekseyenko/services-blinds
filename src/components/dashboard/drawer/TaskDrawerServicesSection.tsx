"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { getServiceTypeColor } from "@/lib/techniciansConfig";
import { isTaskActive } from "@/lib/crm/contract";
import {
  isRepairPaymentComplete,
  repairPaymentDisplayLabel,
  type RepairPaymentMethodId,
} from "@/lib/visits/repairPayment";
import { getExtraServiceTypeLabel } from "@/lib/extraServiceTypeLabels";
import { formatVisitServiceSupplementaryName } from "@/lib/techVisitDisplay";
import type { VisitService } from "@/lib/schemas";
import { visitServiceRepairTotalLabel } from "@/lib/visits/repairPaymentAmount";
import { TECH_DRAWER_KICKER, TECH_DRAWER_SECTION_TITLE } from "./drawerStyles";

export function TaskDrawerServicesSection(props: {
  selectedTask: { status: string; title?: string; address?: string };
  visitServices: VisitService[];
  showPrimaryServiceInList: boolean;
  needsArrivalCheckIn: boolean;
  deletingOppId: string | null;
  onPromptArrivalCheckIn: (detail?: string) => void;
  onAddExtra: () => void;
  onEditExtra: (svc: VisitService) => void;
  onDeleteExtra: (svc: VisitService) => void;
}) {
  const {
    selectedTask,
    visitServices,
    showPrimaryServiceInList,
    needsArrivalCheckIn,
    deletingOppId,
    onPromptArrivalCheckIn,
    onAddExtra,
    onEditExtra,
    onDeleteExtra,
  } = props;

  return (
    <div className="space-y-3" data-tour="tech-drawer-services">
      <div className="flex items-center justify-between">
        <h3 className={TECH_DRAWER_SECTION_TITLE}>Serviços nesta visita</h3>
        {isTaskActive(selectedTask.status) && (
          <button
            type="button"
            data-tour="tech-drawer-extra-add"
            onClick={(e) => {
              e.stopPropagation();
              if (needsArrivalCheckIn) {
                onPromptArrivalCheckIn(
                  "Registe a chegada ao local antes de adicionar um serviço extra."
                );
                return;
              }
              onAddExtra();
            }}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
            aria-label="Adicionar serviço extra no local"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="space-y-2">
        {showPrimaryServiceInList
          ? visitServices
              .filter((svc) => svc.isPrimary)
              .map((svc) => {
                const colors = getServiceTypeColor(svc.serviceType);
                const label = getExtraServiceTypeLabel(svc.serviceType) || svc.name;
                const extraDetail = formatVisitServiceSupplementaryName({
                  rawName: svc.name,
                  serviceLabel: label,
                  visitTitle: selectedTask.title,
                  address: selectedTask.address,
                });
                return (
                  <div
                    key={svc.opportunityId}
                    className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3"
                  >
                    <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                      Principal
                    </span>
                    <span
                      className="rounded-md border px-2.5 py-1 text-xs font-black uppercase tracking-wider"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderColor: `${colors.text}20`,
                      }}
                    >
                      {label}
                    </span>
                    {extraDetail ? (
                      <span className="min-w-0 text-xs font-medium text-muted-foreground">
                        {extraDetail}
                      </span>
                    ) : null}
                  </div>
                );
              })
          : null}

        {visitServices.some((s) => s.createdOnSite) && (
          <p className={`pt-2 ${TECH_DRAWER_KICKER}`}>Serviços extra no local (CRM)</p>
        )}

        {visitServices
          .filter((svc) => svc.createdOnSite)
          .map((svc) => (
            <div
              key={svc.opportunityId}
              className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/10/40 px-4 py-3 text-xs font-semibold text-foreground"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">
                  {getExtraServiceTypeLabel(svc.serviceType) || svc.name}
                </span>
                <span className="flex flex-wrap gap-2">
                  {svc.mode === "later" && (
                    <span className="rounded-full bg-warning-surface px-2 py-0.5 text-xs font-black uppercase text-warning-fg">
                      Agendar depois
                    </span>
                  )}
                  {isRepairPaymentComplete(svc.paymentMethod, svc.paymentDetail) ? (
                    <span className="rounded-full bg-success-surface px-2 py-0.5 text-xs font-black uppercase text-success-fg">
                      Pago ·{" "}
                      {repairPaymentDisplayLabel(
                        svc.paymentMethod as RepairPaymentMethodId,
                        svc.paymentDetail
                      )}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-card px-2 py-0.5 text-xs font-black uppercase text-primary-ink">
                    Registado no CRM
                  </span>
                </span>
              </div>
              {svc.serviceNumber ? (
                <span className="text-muted-foreground">
                  N.º serviço: {svc.serviceNumber}
                  {svc.amountExVatEuros != null && svc.amountExVatEuros > 0 ? (
                    <>
                      {" · "}
                      <span className="font-bold text-foreground">
                        {visitServiceRepairTotalLabel(svc.amountExVatEuros)}
                      </span>
                      <span className="font-normal"> (total c/ IVA)</span>
                    </>
                  ) : null}
                </span>
              ) : null}
              {svc.nsi && svc.nsi !== "N/A" && (
                <span className="text-muted-foreground">NSI: {svc.nsi}</span>
              )}
              {isTaskActive(selectedTask.status) && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditExtra(svc);
                    }}
                    className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl border-2 border-border-strong bg-card text-xs font-black uppercase"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    disabled={deletingOppId === svc.opportunityId}
                    onClick={() => onDeleteExtra(svc)}
                    className="flex min-h-12 flex-1 items-center justify-center gap-1 rounded-xl border border-danger-border bg-danger-surface text-xs font-black uppercase text-danger-fg"
                  >
                    {deletingOppId === svc.opportunityId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Apagar
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}