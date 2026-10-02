"use client";

import { AutoResetErrorPanel } from "@/components/ui/AutoResetErrorPanel";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AutoResetErrorPanel
      title="Erro ao carregar o painel"
      message="O painel do técnico encontrou um problema. Tente novamente ou aguarde a recuperação automática."
      reset={reset}
    />
  );
}
