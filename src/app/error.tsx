"use client";

import { AutoResetErrorPanel } from "@/components/ui/AutoResetErrorPanel";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AutoResetErrorPanel
      title="Erro ao carregar"
      message="Não foi possível mostrar esta página. Tente novamente ou aguarde a recuperação automática."
      reset={reset}
    />
  );
}
