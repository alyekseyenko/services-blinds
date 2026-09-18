"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Erro ao carregar o painel</h2>
      <p className="max-w-md text-sm font-semibold text-slate-600">{error.message}</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
