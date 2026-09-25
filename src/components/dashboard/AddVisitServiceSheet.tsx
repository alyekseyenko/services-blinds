"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { ExtraServiceType, VisitService, VisitServiceMode } from "@/lib/schemas";
import type { Task } from "@/types";
import MeasurementsForm from "@/components/features/measurements/MeasurementsForm";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/ToastContext";
import {
  createVisitServiceAction,
  updateVisitServiceAction,
} from "@/actions/visit-services-actions";
import { EXTRA_SERVICE_TYPE_OPTIONS } from "@/lib/extraServiceTypeLabels";

interface AddVisitServiceSheetProps {
  task: Task & { id: string };
  isOnline: boolean;
  editService?: VisitService | null;
  onClose: () => void;
  onSaved: () => void;
  enqueueVisitService: (payload: Record<string, unknown>) => Promise<{
    queued?: boolean;
    opportunityId?: string;
  }>;
}

export default function AddVisitServiceSheet({
  task,
  isOnline,
  editService,
  onClose,
  onSaved,
  enqueueVisitService,
}: AddVisitServiceSheetProps) {
  const toast = useToast();
  const isEdit = Boolean(editService?.opportunityId);
  const [serviceType, setServiceType] = useState<ExtraServiceType | null>(null);
  const [mode, setMode] = useState<VisitServiceMode>("now");
  const [notes, setNotes] = useState("");
  const [measurementsPayload, setMeasurementsPayload] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const clientRequestId = useMemo(() => crypto.randomUUID(), []);

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
      if (isEdit && editService) {
        const updatePayload = {
          taskId: task.id,
          opportunityId: editService.opportunityId,
          serviceType,
          mode: showModeToggle ? mode : "now",
          notes: notes.trim() || undefined,
          measurements: measurementsPayload || undefined,
        };
        if (!isOnline) {
          toast.error("É necessária ligação à internet para editar.");
          return;
        }
        const result = await updateVisitServiceAction(updatePayload);
        if (!result.success) {
          toast.error("Não foi possível atualizar o serviço", result.error);
          return;
        }
        toast.success("Serviço atualizado", "Alterações guardadas no CRM.");
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

      if (isOnline) {
        const result = await createVisitServiceAction(payload);
        if (!result.success || !result.data?.opportunityId) {
          toast.error("Não foi possível criar o serviço", result.error);
          return;
        }
        toast.success("Serviço criado", "Enviado para o CRM e associado a esta visita.");
        onSaved();
        onClose();
        return;
      }

      await enqueueVisitService(payload);
      toast.info("Guardado offline", "O serviço será sincronizado quando houver rede.");
      onSaved();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">
            {isEdit ? "Editar serviço extra no local" : "Adicionar serviço extra no local"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <p className="text-xs font-semibold text-slate-600">
            Cliente: <span className="text-slate-900">{task.client}</span>
          </p>
          {isEdit && (
            <p className="text-xs text-slate-500">
              As alterações atualizam o serviço no Twenty CRM de imediato.
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
                className={`min-h-12 rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-wide transition-colors ${
                  serviceType === opt.type
                    ? "border-[#84cc16] bg-[#84cc16]/15 text-[#090d16]"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {showModeToggle && (
            <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("now")}
                className={`min-h-12 flex-1 rounded-xl text-xs font-black uppercase ${
                  mode === "now" ? "bg-white shadow text-slate-900" : "text-slate-500"
                }`}
              >
                Fazer agora
              </button>
              <button
                type="button"
                onClick={() => setMode("later")}
                className={`min-h-12 flex-1 rounded-xl text-xs font-black uppercase ${
                  mode === "later" ? "bg-white shadow text-slate-900" : "text-slate-500"
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
            className="min-h-12 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
          />

          {needsMeasurements && serviceType && (
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
                Medições
              </p>
              <MeasurementsForm
                saveBarMode="inline"
                task={task}
                opportunityId={isEdit ? editService?.opportunityId : undefined}
                onSave={async (data) => {
                  setMeasurementsPayload(data);
                  toast.success("Medições prontas", "Serão enviadas ao criar o serviço.");
                  return { success: true };
                }}
              />
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-5">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !serviceType}
            className="min-h-12 w-full bg-[#121622] text-white"
            loading={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              "Guardar alterações"
            ) : (
              "Criar serviço"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
