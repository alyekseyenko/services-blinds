"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import MeasurementsForm from "@/components/features/measurements/MeasurementsForm";
import {
  getAdminMeasurementPayloadAction,
  saveAdminMeasurementRevisionAction,
} from "@/actions/measurements-actions";
import { useToast } from "@/components/ui/ToastContext";
import type { MeasurementsPayload } from "@/lib/schemas";
import type { Task } from "@/types";

export function AdminMeasurementRevision({
  opportunityId,
  clientName,
  onCancel,
  onSaved,
}: {
  opportunityId: string;
  clientName: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [payload, setPayload] = useState<MeasurementsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAdminMeasurementPayloadAction(opportunityId).then((result) => {
      if (cancelled) return;
      if (!result.success || !result.data) {
        setError(result.error || "Sem medições para editar.");
        return;
      }
      setPayload(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-danger-fg">{error}</p>
        <button type="button" onClick={onCancel} className="min-h-12 text-sm font-bold text-muted-foreground">
          Voltar à ficha
        </button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="flex min-h-24 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-ink" aria-label="A carregar medições" />
      </div>
    );
  }

  const task: Task = {
    id: `admin-revision-${opportunityId}`,
    nsi: "",
    client: clientName,
    address: "",
    opportunityId,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-foreground">Editar medições</p>
        <button type="button" onClick={onCancel} className="min-h-12 px-3 text-sm font-bold text-muted-foreground">
          Cancelar
        </button>
      </div>
      <p className="text-xs font-semibold text-muted-foreground">
        Ao guardar, é criada uma versão nova e uma nota no CRM com o seu nome e o que mudou. Os preços mantêm-se.
      </p>
      <MeasurementsForm
        task={task}
        opportunityId={opportunityId}
        seedPayload={payload}
        saveBarMode="inline"
        onSave={async (data) => {
          const result = await saveAdminMeasurementRevisionAction(opportunityId, data);
          if (!result.success || !result.data) {
            return { success: false, error: result.error || "Não foi possível gravar." };
          }
          toast.success(
            `Versão v${result.data.version} criada`,
            result.data.noteSaved
              ? "A alteração ficou na cronologia do serviço no CRM."
              : "A versão foi gravada. A nota no CRM não ficou registada."
          );
          onSaved();
          return { success: true };
        }}
      />
    </div>
  );
}
