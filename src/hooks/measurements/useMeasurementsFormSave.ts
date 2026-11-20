"use client";

import { useCallback, useState } from "react";

import type { MeasurementsPayload } from "@/lib/schemas";
import type { ProductGroup } from "@/types";
import { productGroupsToMeasurementsPayload } from "@/lib/measurementsUtils";
import { toUserMessage } from "@/lib/userMessages";
import { hapticConfirmAfterAsync, hapticTap } from "@/lib/haptics";
import { cueClick } from "@/lib/feedbackCue";
import { isTransientSyncError } from "@/lib/sync/syncQueuePolicy";
type MeasurementsSaveToast = {
  info: (title: string, body: string) => void;
  success: (title: string, body: string) => void;
  error: (title: string, body: string) => void;
  warning: (title: string, body: string) => void;
};

export function useMeasurementsFormSave(input: {
  onSave?: (data: MeasurementsPayload & { updatedAt?: string }) => Promise<{
    success: boolean;
    error?: string;
    queued?: boolean;
  }>;
  productGroups: ProductGroup[];
  clearDraft: () => void;
  setLastLocalSave: (value: string | null) => void;
  collapseAllGroups: () => void;
  toast: MeasurementsSaveToast;
}) {
  const { onSave, productGroups, clearDraft, setLastLocalSave, collapseAllGroups, toast } = input;
  const [loading, setLoading] = useState(false);

  const handleSave = useCallback(async () => {
    if (!onSave) return;

    cueClick();
    hapticTap();

    setLoading(true);

    try {
      const payload = productGroupsToMeasurementsPayload(productGroups);
      const data: MeasurementsPayload & { updatedAt: string } = {
        ...payload,
        updatedAt: new Date().toISOString(),
      };

      const result = await onSave(data);

      if (result && result.success) {
        hapticConfirmAfterAsync("success");
        cueClick();

        clearDraft();
        setLastLocalSave(null);
        collapseAllGroups();

        if (result.queued) {
          toast.info(
            "Medições guardadas no telemóvel",
            "Serão enviadas quando houver rede. O escritório verá a ficha em Medições após sincronizar."
          );
        } else {
          toast.success(
            "Medições guardadas",
            "Ficha disponível no escritório (Medições). Produtos sincronizados com o CRM."
          );
        }
      } else {
        hapticConfirmAfterAsync("error");
        cueClick();
        const err = result?.error || "O servidor não confirmou a gravação.";
        toast.error("Erro ao guardar medições", toUserMessage(err, err));
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";

      if (isTransientSyncError(raw) || !raw) {
        toast.warning(
          "Rascunho protegido",
          "Erro de ligação com o servidor. O rascunho continua no telemóvel por segurança."
        );
      } else {
        toast.error("Erro ao guardar medições", toUserMessage(e, "Não foi possível guardar as medições."));
      }
    } finally {
      setLoading(false);
    }
  }, [onSave, productGroups, clearDraft, setLastLocalSave, collapseAllGroups, toast]);

  return { loading, handleSave };
}