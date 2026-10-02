"use client";

import { AutoResetErrorPanel } from "@/components/ui/AutoResetErrorPanel";

export default function WarehouseError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AutoResetErrorPanel
      title="Erro no armazém"
      message="Não foi possível carregar o painel de preparação. Tente novamente em instantes."
      reset={reset}
    />
  );
}
