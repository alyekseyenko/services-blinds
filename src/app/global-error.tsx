"use client";

import { AutoResetErrorPanel } from "@/components/ui/AutoResetErrorPanel";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-PT">
      <body>
        <AutoResetErrorPanel
          title="Erro inesperado"
          message="Ocorreu um problema ao carregar a aplicação. Vamos tentar recuperar automaticamente."
          reset={reset}
        />
      </body>
    </html>
  );
}
