"use client";

import { useCallback, useEffect } from "react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export function useMeasurementPriceBeforeUnload(priceDirty: boolean): void {
  useEffect(() => {
    if (!priceDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [priceDirty]);
}

export function useConfirmDiscardUnsavedPrices(priceDirty: boolean) {
  const confirm = useConfirm();

  return useCallback(async (): Promise<boolean> => {
    if (!priceDirty) return true;
    return confirm({
      title: "Preços por guardar",
      description:
        "Alterou preços que ainda não foram guardados. Se continuar, perde essas alterações.",
      confirmLabel: "Continuar sem guardar",
      cancelLabel: "Voltar",
      destructive: true,
    });
  }, [confirm, priceDirty]);
}

/** Aviso de saída (uma instância por ecrã) e confirmação antes de ações com preços por guardar. */
export function useMeasurementSheetPriceDirtyGuard(priceDirty: boolean) {
  useMeasurementPriceBeforeUnload(priceDirty);
  const confirmDiscard = useConfirmDiscardUnsavedPrices(priceDirty);
  return { confirmDiscard, priceDirty };
}