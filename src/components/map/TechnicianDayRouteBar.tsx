"use client";

import { isTaskCompleted } from "@/lib/crm/contract";
import { openDayRoute } from "@/lib/navigationUtils";

type RouteStop = {
  coordinates?: [number, number] | null;
  status?: string;
  taskStatus?: string;
};

export function TechnicianDayRouteBar({
  stops,
  origin,
  onExit,
}: {
  stops: RouteStop[];
  origin: { lat: number; lng: number } | null;
  onExit: () => void;
}) {
  const points = stops
    .map((stop) => stop.coordinates)
    .filter((coords): coords is [number, number] => Array.isArray(coords));
  const nextStop =
    stops.find((stop) => !isTaskCompleted(stop.status || stop.taskStatus) && stop.coordinates) ??
    stops.find((stop) => stop.coordinates);
  const wazePoint = nextStop?.coordinates ? [nextStop.coordinates] : points.slice(0, 1);

  return (
    <div className="absolute left-3 right-3 top-3 z-30 flex flex-col gap-2">
      <button
        type="button"
        onClick={onExit}
        className="flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-border-strong bg-card px-3 text-xs font-black uppercase tracking-wider text-foreground"
      >
        Sair da rota
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openDayRoute("google", points, origin)}
          className="flex min-h-12 items-center justify-center rounded-xl bg-ink px-2 text-xs font-black uppercase tracking-wider text-neon"
        >
          Google Maps
        </button>
        <button
          type="button"
          onClick={() => openDayRoute("waze", wazePoint)}
          className="flex min-h-12 items-center justify-center rounded-xl bg-info-solid px-2 text-xs font-black uppercase tracking-wider text-ink-foreground"
        >
          Waze
        </button>
      </div>
      {points.length > 1 ? (
        <p className="rounded-xl border border-border bg-card/95 px-3 py-2 text-xs font-semibold text-muted-foreground">
          O Google Maps abre a rota toda. O Waze abre a próxima paragem.
        </p>
      ) : null}
    </div>
  );
}
