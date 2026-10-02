"use client";

import { AutoResetErrorPanel } from "@/components/ui/AutoResetErrorPanel";

export default function CeoError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AutoResetErrorPanel
      title="Erro no painel executivo"
      message="Não foi possível carregar as métricas. A página será recarregada automaticamente."
      reset={reset}
    />
  );
}
