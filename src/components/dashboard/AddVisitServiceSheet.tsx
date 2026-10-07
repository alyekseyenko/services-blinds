"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ExtraServiceType, VisitService, VisitServiceMode } from "@/lib/schemas";
import type { Task } from "@/types";
import MeasurementsForm from "@/components/features/measurements/MeasurementsForm";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastContext";
import { updateVisitServiceAction } from "@/actions/visit-services-actions";
import { EXTRA_SERVICE_TYPE_OPTIONS } from "@/lib/extraServiceTypeLabels";
import { getServiceTypeColor } from "@/lib/techniciansConfig";
import { isOnboardingDemoEntity } from "@/lib/onboarding/demoMapPin";
import { toUserMessage } from "@/lib/userMessages";
import { getNotificationScope } from "@/lib/inAppNotifications";
import { markLocalAgendaChange } from "@/lib/agendaLocalChanges";
import { cn } from "@/lib/cn";

const FIELD_KICKER = "text-xs font-bold text-muted-foreground";
const FIELD_BODY = "text-sm font-semibold leading-snug text-foreground";
const FIELD_TEXTAREA =
  "w-full min-h-12 rounded-xl border-2 border-border-strong bg-input px-3 py-2.5 text-sm font-semibold leading-snug text-foreground placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 outline-none resize-none";

interface AddVisitServiceSheetProps {
  task: Task & { id: string };
  isOnline: boolean;
  editService?: VisitService | null;
  onClose: () => void;
  onSaved: () => void;
  enqueueVisitService: (payload: Record<string, unknown>) => Promise<{
    success: boolean;
    queued: boolean;
    error?: string;
    opportunityId?: string;
  }>;
  technicianId?: string;
}

export default function AddVisitServiceSheet({
  task,
  isOnline,
  editService,
  onClose,
  onSaved,
  enqueueVisitService,
  technicianId,
}: AddVisitServiceSheetProps) {
  const toast = useToast();
  const isEdit = Boolean(editService?.opportunityId);
  const [serviceType, setServiceType] = useState<ExtraServiceType | null>(null);
  const [mode, setMode] = useState<VisitServiceMode>("now");
  const [notes, setNotes] = useState("");
  const [measurementsPayload, setMeasurementsPayload] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const clientRequestId = useMemo(() => crypto.randomUUID(), []);
  const draftOpportunityId = isEdit
    ? editService?.opportunityId
    : `new_extra_${clientRequestId}`;

  useEffect(() => {
    if (editService) {
      const t = editService.serviceType as ExtraServiceType;
      if (EXTRA_SERVICE_TYPE_OPTIONS.some((o) => o.type === t)) {
        setServiceType(t);
      }
      setMode(editService.mode || "now");
      setNotes("");
      setMeasurementsPayload(null);
    } else {
      setServiceType(null);
      setMode("now");
      setNotes("");
      setMeasurementsPayload(null);
    }
  }, [editService]);

  const needsMeasurements = serviceType === "TIRAR_MEDIDAS" || serviceType === "REMEDICAO";
  const showModeToggle = serviceType === "MANUTENCAO" || serviceType === "REPARACAO";

  const sheetDescription = useMemo(() => {
    const client = task.client?.trim() || "Cliente";
    const addr = task.address?.trim();
    if (addr) return `${client} · ${addr}`;
    return client;
  }, [task.client, task.address]);

  const handleSubmit = async () => {
    if (!serviceType) {
      toast.error("Selecione o tipo de serviço");
      return;
    }
    if (!isEdit && needsMeasurements && !measurementsPayload) {
      toast.error("Guarde as medições no formulário antes de criar o serviço");
      return;
    }

    setSubmitting(true);
    try {
      if (isOnboardingDemoEntity({ id: task.id })) {
        toast.success(
          "Serviço extra (formação)",
          "Exemplo guardado só neste guia — nada foi enviado ao CRM."
        );
        onSaved();
        onClose();
        return;
      }

      if (isEdit && editService) {
        if (!isOnline) {
          toast.error("Sem rede", "É necessária ligação à internet para editar.");
          return;
        }
        const updatePayload = {
          taskId: task.id,
          opportunityId: editService.opportunityId,
          serviceType,
          mode: showModeToggle ? mode : "now",
          notes: notes.trim() || undefined,
          measurements: measurementsPayload || undefined,
        };
        const result = await updateVisitServiceAction(updatePayload);
        if (!result.success) {
          toast.error(
            "Não foi possível atualizar o serviço",
            toUserMessage(result.error, "Não foi possível atualizar o serviço.")
          );
          return;
        }
        toast.success("Serviço atualizado", "Alterações guardadas no CRM.");
        if (technicianId) {
          const scope = getNotificationScope("technician", technicianId);
          markLocalAgendaChange(scope, task.id, ["servico_extra"]);
          markLocalAgendaChange(scope, editService.opportunityId, ["servico_extra"]);
        }
        onSaved();
        onClose();
        return;
      }

      const payload = {
        taskId: task.id,
        clientRequestId,
        serviceType,
        mode: showModeToggle ? mode : "now",
        notes: notes.trim() || undefined,
        measurements: needsMeasurements ? measurementsPayload : undefined,
      };

      const result = await enqueueVisitService(payload);
      if (!result.success) {
        toast.error(
          "Não foi possível criar o serviço",
          toUserMessage(result.error, "Não foi possível criar o serviço.")
        );
        return;
      }
      if (result.queued) {
        toast.info("Guardado offline", "O serviço será sincronizado quando houver rede.");
      } else {
        toast.success("Serviço criado", "Enviado para o CRM e associado a esta visita.");
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      toast.error("Não foi possível criar o serviço", toUserMessage(e, "Erro de ligação."));
    } finally {
      setSubmitting(false);
    }
  };

  const title = isEdit ? "Editar serviço extra" : "Serviço extra no local";

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      description={sheetDescription}
      flexBody
      fullScreen
      priority="elevated"
      panelDataTour="tech-add-service-panel"
      className="add-service-sheet-root flex w-full flex-col bg-background brutal-grid-bg"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">
          {isEdit && (
            <p className={cn(FIELD_BODY, "text-muted-foreground")}>
              {isOnline
                ? "As alterações atualizam o serviço no CRM de imediato."
                : "Sem rede — a edição está indisponível até voltar a ter ligação."}
            </p>
          )}

          <section className="space-y-3" data-tour="tech-add-service-type">
            <p className={FIELD_KICKER}>Tipo de serviço</p>
            <div className="grid grid-cols-2 gap-2.5">
              {EXTRA_SERVICE_TYPE_OPTIONS.map((opt) => {
                const selected = serviceType === opt.type;
                const colors = getServiceTypeColor(opt.type);
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setServiceType(opt.type);
                      if (opt.type === "TIRAR_MEDIDAS" || opt.type === "REMEDICAO") {
                        setMode("now");
                      }
                    }}
                    className={cn(
                      "min-h-14 rounded-xl border-2 px-3 py-3 text-sm font-bold leading-snug transition-all active:scale-[0.98]",
                      selected
                        ? "border-border-strong shadow-sm"
                        : "border-border-strong bg-card text-foreground hover:bg-muted/80"
                    )}
                    style={
                      selected
                        ? {
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.text,
                          }
                        : undefined
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          {showModeToggle && (
            <section className="space-y-2">
              <p className={FIELD_KICKER}>Quando fazer</p>
              <div className="flex gap-2 rounded-2xl border-2 border-border-strong bg-muted p-1.5">
                <button
                  type="button"
                  onClick={() => setMode("now")}
                  className={cn(
                    "min-h-12 flex-1 rounded-xl text-sm font-bold transition-all active:scale-[0.98]",
                    mode === "now"
                      ? "border-2 border-border-strong bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  Fazer agora
                </button>
                <button
                  type="button"
                  onClick={() => setMode("later")}
                  className={cn(
                    "min-h-12 flex-1 rounded-xl text-sm font-bold transition-all active:scale-[0.98]",
                    mode === "later"
                      ? "border-2 border-border-strong bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  Agendar depois
                </button>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <p className={FIELD_KICKER}>Notas (opcional)</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nota para o CRM…"
              rows={3}
              className={cn(FIELD_TEXTAREA, "min-h-[4.5rem]")}
            />
          </section>

          {needsMeasurements && serviceType && (
            <section className="rounded-2xl border-2 border-border-strong bg-card p-4">
              <p className={cn(FIELD_KICKER, "mb-3")}>Medições</p>
              <MeasurementsForm
                saveBarMode="inline"
                task={task}
                opportunityId={draftOpportunityId}
                onSave={async (data) => {
                  setMeasurementsPayload(data);
                  toast.info("Medições associadas", "Serão enviadas ao criar o serviço.");
                  return { success: true };
                }}
              />
            </section>
          )}
        </div>

        <div className="shrink-0 border-t-2 border-border-strong bg-card px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !serviceType || (isEdit && !isOnline)}
            className="min-h-12 w-full border-2 border-border-strong"
            loading={submitting}
            loadingText={isEdit ? "A guardar..." : "A criar..."}
          >
            {isEdit ? "Guardar alterações" : "Criar serviço"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
