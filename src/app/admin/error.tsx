"use client";

import { AutoResetErrorPanel } from "@/components/ui/AutoResetErrorPanel";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AutoResetErrorPanel
      title="Erro no painel operacional"
      message="O painel de administração encontrou um problema. A página será recarregada em breve."
      reset={reset}
    />
  );
}
