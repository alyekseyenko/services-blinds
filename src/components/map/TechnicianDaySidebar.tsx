"use client";

import { useEffect } from "react";
import { Clock, MapPin, X } from "lucide-react";
import { firstOpenStopIndex, itineraryStopKind } from "@/lib/map/technicianDayItinerary";
import { cn } from "@/lib/cn";

export type TechnicianDayStop = {
  id?: string;
  twentyId?: string;
  client?: string;
  title?: string;
  address?: string;
  coordinates?: [number, number] | null;
  status?: string;
  taskStatus?: string;
  report?: string;
  scheduledAt?: string | Date | null;
  dueDate?: Date | string | null;
  dueAt?: string | Date | null;
  isOverdue?: boolean;
};

type TechnicianDaySidebarProps = {
  technicianName: string;
  origin: { lat: number; lng: number };
  stops: TechnicianDayStop[];
  unscheduled: TechnicianDayStop[];
  onClose: () => void;
  onOpenStop: (stop: TechnicianDayStop) => void;
};

function distanceKm(origin: { lat: number; lng: number }, coords?: [number, number] | null) {
  if (!coords) return null;
  const km =
    Math.sqrt(Math.pow(coords[0] - origin.lat, 2) + Math.pow(coords[1] - origin.lng, 2)) * 111;
  return Math.round(km * 10) / 10;
}

function visitStatus(stop: TechnicianDayStop) {
  const kind = itineraryStopKind({
    ...stop,
    scheduledAt: stop.scheduledAt ?? stop.dueAt ?? null,
  });
  const done = kind === "done";
  const incomplete = kind === "incomplete";
  const cancelled = kind === "cancelled";
  const late = kind === "late";
  const label =
    kind === "done"
      ? "Concluído"
      : kind === "incomplete"
        ? "Incompleto"
        : kind === "cancelled"
          ? "Cancelado"
          : kind === "late"
            ? "Atrasada"
            : "Pendente";
  return { done, incomplete, cancelled, late, label };
}

function formatWhen(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export function TechnicianDaySidebar({
  technicianName,
  origin,
  stops,
  unscheduled,
  onClose,
  onOpenStop,
}: TechnicianDaySidebarProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  let closest: TechnicianDayStop | null = null;
  let closestKm = Infinity;
  for (const candidate of unscheduled) {
    const km = distanceKm(origin, candidate.coordinates);
    if (km !== null && km < closestKm) {
      closestKm = km;
      closest = candidate;
    }
  }

  const doneCount = stops.filter((stop) => visitStatus(stop).done).length;
  const nextIndex = firstOpenStopIndex(stops);

  return (
    <aside
      className="absolute inset-y-0 right-0 z-30 flex w-[min(92%,34rem)] flex-col border-l-2 border-border-strong bg-card shadow-2xl"
      aria-label={`Resumo de ${technicianName}`}
    >
      <header className="flex items-start justify-between gap-3 border-b-2 border-border-strong bg-muted px-4 py-4">
        <div className="min-w-0">
          <p className="ds-kicker text-muted-foreground">Resumo</p>
          <h2 className="mt-1 truncate text-lg font-black text-foreground">{technicianName}</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Em campo · ativo</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-border-strong bg-card text-foreground"
          aria-label="Fechar resumo"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-3">
        <div className="rounded-xl border border-border bg-muted/50 px-3 py-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">Hoje</p>
          <p className="ds-num text-xl font-black text-foreground">{stops.length}</p>
          <p className="text-xs text-muted-foreground">
            {stops.length === 1 ? "visita" : "visitas"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/50 px-3 py-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">Concluídas</p>
          <p className="ds-num text-xl font-black text-foreground">{doneCount}</p>
          <p className="text-xs text-muted-foreground">de {stops.length}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {stops.length > 0 ? (
          <div className="space-y-2">
            <h3 className="ds-kicker text-muted-foreground">Itinerário de hoje</h3>
            {stops.map((stop, index) => {
              const status = visitStatus(stop);
              const km = distanceKm(origin, stop.coordinates);
              const minutes = km === null ? null : Math.max(2, Math.round((km / 40) * 60));
              const when = formatWhen(stop.scheduledAt);
              const isNext = index === nextIndex;
              const showDistance = isNext && km !== null;
              return (
                <button
                  key={stop.id || stop.twentyId || index}
                  type="button"
                  onClick={() => onOpenStop(stop)}
                  className={cn(
                    "flex w-full min-h-12 flex-col gap-1 rounded-xl border px-3 py-3 text-left",
                    status.done && "border-success-border bg-success-surface/70",
                    status.incomplete && "border-warning-border bg-warning-surface/70",
                    status.cancelled && "border-danger-border bg-danger-surface/70",
                    status.late && "border-warning-border bg-warning-surface",
                    isNext && "border-primary bg-primary-surface/80",
                    !isNext &&
                      !status.done &&
                      !status.incomplete &&
                      !status.cancelled &&
                      !status.late &&
                      "border-border bg-muted"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-ink-foreground",
                          status.done && "bg-success-solid",
                          status.incomplete && "bg-warning-solid",
                          status.cancelled && "bg-danger-solid",
                          !status.done && !status.incomplete && !status.cancelled && "bg-info"
                        )}
                      >
                        {status.done ? "✓" : status.cancelled ? "✕" : index + 1}
                      </span>
                      <span className="truncate text-sm font-bold text-foreground">
                        {stop.client || stop.title}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-card px-2 py-1 text-xs font-black uppercase text-foreground">
                      {isNext ? "Próxima" : status.label}
                    </span>
                  </span>
                  {when ? (
                    <span className="flex items-center gap-1 pl-9 text-xs font-semibold text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {when}
                    </span>
                  ) : null}
                  {stop.address ? (
                    <span className="flex items-start gap-1 pl-9 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>{stop.address}</span>
                    </span>
                  ) : null}
                  {(status.incomplete || status.cancelled || status.done) && stop.report ? (
                    <span className="pl-9 text-xs font-medium text-foreground">Nota: {stop.report}</span>
                  ) : null}
                  {showDistance ? (
                    <span className="pl-9 text-xs font-bold text-info-fg">
                      A ~{km.toFixed(1)} km (~{minutes} min)
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-xl border border-border bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground">
              Sem visitas agendadas para hoje.
            </p>
            {closest ? (
              <div className="rounded-xl border border-success-border bg-success-surface/80 p-3">
                <p className="ds-kicker text-success-fg">Obra por agendar mais próxima</p>
                <p className="mt-2 text-sm font-bold text-foreground">
                  {closest.client || closest.title}
                </p>
                {closest.address ? (
                  <p className="mt-1 text-xs text-muted-foreground">{closest.address}</p>
                ) : null}
                <p className="mt-2 text-xs font-bold text-success-fg">
                  A ~{closestKm.toFixed(1)} km do técnico
                </p>
                <button
                  type="button"
                  onClick={() => onOpenStop(closest)}
                  className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-ink px-3 text-xs font-black uppercase text-neon"
                >
                  Agendar para este técnico
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
