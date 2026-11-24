"use client";

import type { RefObject } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceSummarizeButton, VoiceTextarea } from "@/components/ui/VoiceTextarea";
import {
  RepairPaymentAmountField,
  RepairPaymentMethodPicker,
  RepairPaymentOtherDetailField,
} from "@/components/dashboard/RepairPaymentMethodPicker";
import { INCOMPLETE_REASONS, formatIncompleteReason } from "@/lib/taskReasons";
import { getExtraServiceTypeLabel } from "@/lib/extraServiceTypeLabels";
import type { VisitService } from "@/lib/schemas";
import type { useRepairPaymentDrawerState } from "@/components/dashboard/drawer/useRepairPaymentDrawerState";
import { cueClick } from "@/lib/feedbackCue";
import { hapticSelection } from "@/lib/haptics";
import { TECH_DRAWER_KICKER, TECH_DRAWER_SECTION_TITLE, TECH_DRAWER_TEXTAREA } from "./drawerStyles";

export function TaskDrawerFinalizeSection(props: {
  finalizeSectionRef: RefObject<HTMLDivElement | null>;
  statusAction: string;
  setStatusAction: (v: string) => void;
  setReason: (v: string) => void;
  reason: string;
  reasonPreset: string;
  setReasonPreset: (v: string) => void;
  isUploading: boolean;
  needsArrivalCheckIn: boolean;
  onPromptArrivalCheckIn: (detail?: string) => void;
  repairServices: VisitService[];
  repairPayment: ReturnType<typeof useRepairPaymentDrawerState>;
  repairPaymentMissing: boolean;
  showStatusSubmitBar: boolean;
  onSubmitStatus: () => void;
}) {
  const {
    finalizeSectionRef,
    statusAction,
    setStatusAction,
    setReason,
    reason,
    reasonPreset,
    setReasonPreset,
    isUploading,
    needsArrivalCheckIn,
    onPromptArrivalCheckIn,
    repairServices,
    repairPayment,
    repairPaymentMissing,
    showStatusSubmitBar,
    onSubmitStatus,
  } = props;

  return (
    <>
      <div className="h-px bg-secondary w-full my-8"></div>
      <div
        ref={finalizeSectionRef}
        className="space-y-6 scroll-mt-4"
        data-tour="tech-drawer-finalize"
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary-ink" />
          <h3 className={TECH_DRAWER_SECTION_TITLE}>Finalizar visita</h3>
        </div>

        <div className="flex bg-muted p-1.5 rounded-2xl border border-border shadow-inner">
          <button
            type="button"
            disabled={isUploading}
            data-tour="tech-drawer-status-concluido"
            onClick={() => {
              if (needsArrivalCheckIn) {
                onPromptArrivalCheckIn();
                return;
              }
              cueClick();
              hapticSelection();
              setStatusAction("Concluído");
              setReason("");
            }}
            className={`min-h-12 flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
              statusAction === "Concluído"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Concluído
          </button>
          <button
            type="button"
            disabled={isUploading}
            data-tour="tech-drawer-status-incompleto"
            onClick={() => {
              if (needsArrivalCheckIn) {
                onPromptArrivalCheckIn();
                return;
              }
              cueClick();
              hapticSelection();
              setStatusAction("Incompleto");
              setReason("");
            }}
            className={`min-h-12 flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
              statusAction === "Incompleto"
                ? "bg-warning-solid text-ink-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Incompleto
          </button>
          <button
            type="button"
            disabled={isUploading}
            data-tour="tech-drawer-status-cancelado"
            onClick={() => {
              cueClick();
              hapticSelection();
              setStatusAction("Cancelado");
              setReason("");
            }}
            className={`min-h-12 flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
              statusAction === "Cancelado"
                ? "bg-danger-solid text-ink-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cancelado
          </button>
        </div>

        {statusAction && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {statusAction === "Concluído" && repairServices.length > 0 ? (
              <div className="space-y-3" data-tour="tech-drawer-repair-payment">
                <p className={`px-1 ${TECH_DRAWER_KICKER}`}>Pagamento da reparação (obrigatório)</p>
                {repairServices.map((service) => {
                  const label = getExtraServiceTypeLabel(service.serviceType) || service.name;
                  const {
                    repairPayments,
                    setRepairPayments,
                    repairPaymentDetails,
                    setRepairPaymentDetails,
                    repairPaymentAmounts,
                    setRepairPaymentAmounts,
                    repairPaymentAmountLocked,
                    confirmRepairPaymentAmount,
                    unlockRepairPaymentAmount,
                    touchRepairPaymentAmountInput,
                  } = repairPayment;
                  return (
                    <div key={service.opportunityId} className="space-y-3">
                      <p className="px-1 text-xs font-bold text-foreground">
                        {label}
                        {service.isPrimary ? "" : " · serviço extra"}
                      </p>
                      <div className="grid grid-cols-2 gap-3 items-start">
                        <div className="col-span-2 min-w-0 sm:col-span-1 sm:order-2">
                          <RepairPaymentAmountField
                            id={`repair-pay-amount-${service.opportunityId}`}
                            value={repairPaymentAmounts[service.opportunityId] ?? ""}
                            disabled={isUploading}
                            amountLocked={repairPaymentAmountLocked[service.opportunityId]}
                            onConfirmAmount={(exVat) =>
                              confirmRepairPaymentAmount(service.opportunityId, exVat)
                            }
                            onEditAmount={() => unlockRepairPaymentAmount(service.opportunityId)}
                            onChange={(text) => {
                              touchRepairPaymentAmountInput(service.opportunityId);
                              setRepairPaymentAmounts((current) => ({
                                ...current,
                                [service.opportunityId]: text,
                              }));
                            }}
                          />
                        </div>
                        <div className="col-span-2 min-w-0 space-y-2 sm:col-span-1 sm:order-1">
                          <p className={`px-1 ${TECH_DRAWER_KICKER}`}>Como pagou (obrigatório)</p>
                          <RepairPaymentMethodPicker
                            value={repairPayments[service.opportunityId]}
                            onChange={(method) => {
                              setRepairPayments((current) => ({
                                ...current,
                                [service.opportunityId]: method,
                              }));
                              if (method !== "outros") {
                                setRepairPaymentDetails((current) => {
                                  const { [service.opportunityId]: _removed, ...rest } = current;
                                  return rest;
                                });
                              }
                            }}
                            disabled={isUploading}
                            splitWithAmount
                          />
                        </div>
                      </div>
                      {repairPayments[service.opportunityId] === "outros" ? (
                        <RepairPaymentOtherDetailField
                          id={`repair-pay-detail-${service.opportunityId}`}
                          value={repairPaymentDetails[service.opportunityId] ?? ""}
                          disabled={isUploading}
                          onChange={(text) =>
                            setRepairPaymentDetails((current) => ({
                              ...current,
                              [service.opportunityId]: text,
                            }))
                          }
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {statusAction === "Incompleto" && (
              <div className="space-y-2">
                <label className={`block px-1 ${TECH_DRAWER_KICKER}`}>Motivo (obrigatório)</label>
                <div className="grid grid-cols-1 gap-2">
                  {INCOMPLETE_REASONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReasonPreset(opt.id)}
                      className={`text-left px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                        reasonPreset === opt.id
                          ? "bg-warning-surface border-warning-border text-warning-fg"
                          : "bg-card border-border text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {(reasonPreset === "outro" || reasonPreset) && (
                  <VoiceTextarea
                    value={reason}
                    disabled={isUploading}
                    onChange={setReason}
                    placeholder={reasonPreset === "outro" ? "Descreva o motivo…" : "Detalhes (opcional)"}
                    rows={3}
                    textareaClassName={`${TECH_DRAWER_TEXTAREA} min-h-[5.5rem] flex-1`}
                    className="w-full"
                  />
                )}
              </div>
            )}

            {statusAction === "Cancelado" && (
              <div className="space-y-2">
                <label className={`block px-1 ${TECH_DRAWER_KICKER}`}>
                  Motivo do cancelamento (obrigatório)
                </label>
                <VoiceTextarea
                  value={reason}
                  onChange={setReason}
                  placeholder="Motivo do cancelamento…"
                  rows={3}
                  disabled={isUploading}
                  textareaClassName={`${TECH_DRAWER_TEXTAREA} min-h-[5.5rem] flex-1`}
                  className="w-full"
                />
              </div>
            )}

            {(statusAction === "Incompleto" || statusAction === "Cancelado") &&
            (reason.trim() || (statusAction === "Incompleto" && reasonPreset)) ? (
              <VoiceSummarizeButton
                text={
                  statusAction === "Incompleto" && reasonPreset
                    ? formatIncompleteReason(reasonPreset, reason)
                    : reason
                }
                onSummarized={setReason}
                disabled={isUploading}
                className="w-full"
              />
            ) : null}

            {!showStatusSubmitBar ? (
              <Button
                variant="inverse"
                data-tour="tech-drawer-submit-report"
                onClick={onSubmitStatus}
                disabled={isUploading || repairPaymentMissing}
                className="w-full py-5 shadow-md"
                loading={isUploading}
              >
                Submeter Relatório de Serviço
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}