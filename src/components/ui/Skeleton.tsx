import { cn } from "@/lib/cn";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-slate-200/80", className)}
      aria-hidden="true"
    />
  );
}

export function MapSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-4" aria-busy="true" aria-label="A carregar mapa">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="flex-1 w-full rounded-[2rem]" />
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6" aria-busy="true" aria-label="A carregar agenda">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="A carregar métricas">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
  );
}

export function WarehouseFeedSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="A carregar encomendas">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
