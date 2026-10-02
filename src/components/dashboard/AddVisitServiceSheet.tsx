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
import { isOnboardingDemoEntity } from "@/lib/onboarding/demoMapPin";
import { toUserMessage } from "@/lib/userMessages";
import { getNotificationScope } from "@/lib/inAppNotifications";
import { markLocalAgendaChange } from "@/lib/agendaLocalChanges";

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

  const title = isEdit ? "Editar serviço extra no local" : "Adicionar serviço extra no local";

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      flexBody
      priority="elevated"
      panelDataTour="tech-add-service-panel"
      className="add-service-sheet-root mx-auto w-full max-w-lg"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
          <p className="text-xs font-semibold text-muted-foreground">
            Cliente: <span className="text-foreground">{task.client}</span>
          </p>
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              {isOnline
                ? "As alterações atualizam o serviço no CRM de imediato."
                : "Sem rede — a edição está indisponível até voltar a ter ligação."}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {EXTRA_SERVICE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => {
                  setServiceType(opt.type);
                  if (opt.type === "TIRAR_MEDIDAS" || opt.type === "REMEDICAO") {
                    setMode("now");
                  }
                }}
                className={`min-h-12 rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-wide transition-colors active:scale-[0.98] ${
                  serviceType === opt.type
                    ? "border-border-strong bg-primary/15 text-foreground"
                    : "border-border bg-muted text-muted-foreground hover:border-border"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {showModeToggle && (
            <div className="flex gap-2 rounded-2xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("now")}
                className={`min-h-12 flex-1 rounded-xl text-xs font-black uppercase active:scale-[0.98] ${
                  mode === "now" ? "bg-card shadow text-foreground" : "text-muted-foreground"
                }`}
              >
                Fazer agora
              </button>
              <button
                type="button"
                onClick={() => setMode("later")}
                className={`min-h-12 flex-1 rounded-xl text-xs font-black uppercase active:scale-[0.98] ${
                  mode === "later" ? "bg-card shadow text-foreground" : "text-muted-foreground"
                }`}
              >
                Agendar depois
              </button>
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas para o CRM (opcional)"
            className="min-h-12 w-full rounded-2xl border border-border px-4 py-3 text-base font-semibold text-foreground md:text-sm"
          />

          {needsMeasurements && serviceType && (
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
                Medições
              </p>
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
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            variant="inverse"
            onClick={handleSubmit}
            disabled={submitting || !serviceType || (isEdit && !isOnline)}
            className="min-h-12 w-full"
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
