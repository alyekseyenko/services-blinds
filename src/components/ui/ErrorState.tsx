import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title = "Algo correu mal",
  message,
  onRetry,
  retryLabel = "Tentar novamente",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger-border bg-danger-surface px-6 py-10 text-center">
      <AlertCircle className="h-10 w-10 text-danger-solid" aria-hidden />
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-danger-fg">{title}</p>
        <p className="mt-1 text-xs font-medium text-danger-fg">{message}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" className="min-h-12" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
