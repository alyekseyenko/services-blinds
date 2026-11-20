"use client";

import { useState } from "react";
import {
  MapPin,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import type { RouteStop } from "@/types/admin";
import { HQ_LABEL } from "@/lib/branding";
import { cn } from "@/lib/cn";
import type { RouteStopListRow } from "@/components/admin/route/routeSidebarUtils";

const ROUTE_DRAG_MIME = "application/x-route-visit-index";

export function RouteStopsList(props: {
  stopCount: number;
  listItems: RouteStopListRow[];
  optimizedRoute: OptimizedRouteStop[] | null;
  routeManuallyAdjusted: boolean;
  onManualRouteReorder: (fromVisitIndex: number, toVisitIndex: number) => void;
  toggleSelectionForRoute: (item: RouteStop) => void;
}) {
  const {
    stopCount,
    listItems,
    optimizedRoute,
    routeManuallyAdjusted,
    onManualRouteReorder,
    toggleSelectionForRoute,
  } = props;

  const [dragVisitIndex, setDragVisitIndex] = useState<number | null>(null);

  if (stopCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
        <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-xs font-bold text-muted-foreground">
          Toque nos pins do mapa para adicionar visitas ao roteiro.
        </p>
      </div>
    );
  }

  return (
  <div className="space-y-2">
    {optimizedRoute && (
      <p className="mb-2 rounded-xl border border-warning-border bg-warning-surface px-3 py-2 text-xs font-semibold leading-snug text-warning-fg">
        {routeManuallyAdjusted
          ? "Ordem ajustada manualmente — km e custos recalculados para esta sequência."
          : "Arraste as paragens (ou use as setas) para ajustar a ordem antes de agendar."}
      </p>
    )}
    <ul className="space-y-1">
      {listItems.map((row) => {
        if (row.kind === "hq-start") {
          return (
            <li
              key={row.key}
              className="flex items-center gap-3 rounded-xl border border-primary/30/80 bg-primary/10/80 px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-ink-foreground">
                HQ
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-primary-ink">Partida</p>
                <p className="truncate text-xs font-bold text-foreground">{HQ_LABEL}</p>
              </div>
            </li>
          );
        }
        if (row.kind === "hq-end") {
          const km =
            row.stop && "distanceFromLast" in row.stop ? row.stop.distanceFromLast : undefined;
          return (
            <li
              key={row.key}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted-foreground text-xs font-black text-ink-foreground">
                ↩
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-muted-foreground">
                  {optimizedRoute ? "Regresso sede" : "Regresso (após otimizar)"}
                </p>
                <p className="text-xs font-bold text-foreground">Sede</p>
                {km != null && (
                  <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                    +{km} km · ~{Math.round(Number(km) * 2)} min
                  </p>
                )}
              </div>
            </li>
          );
        }
        const item = row.stop!;
        const km = "distanceFromLast" in item ? item.distanceFromLast : undefined;
        const visitIndex = (row.index ?? 1) - 1;
        const canReorder = Boolean(optimizedRoute);
        return (
          <li
            key={row.key}
            draggable={canReorder}
            onDragStart={(e) => {
              if (!canReorder) return;
              e.dataTransfer.setData(ROUTE_DRAG_MIME, String(visitIndex));
              e.dataTransfer.setData("text/plain", String(visitIndex));
              e.dataTransfer.effectAllowed = "move";
              setDragVisitIndex(visitIndex);
            }}
            onDragEnd={() => setDragVisitIndex(null)}
            onDragOver={(e) => {
              if (!canReorder) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              if (!canReorder) return;
              e.preventDefault();
              e.stopPropagation();
              const raw =
                e.dataTransfer.getData(ROUTE_DRAG_MIME) || e.dataTransfer.getData("text/plain");
              const fromIndex =
                raw !== "" ? Number.parseInt(raw, 10) : dragVisitIndex ?? Number.NaN;
              if (!Number.isNaN(fromIndex) && fromIndex !== visitIndex) {
                onManualRouteReorder(fromIndex, visitIndex);
              }
              setDragVisitIndex(null);
            }}
            className={cn(
              "flex items-start gap-2 rounded-xl border bg-card px-3 py-2.5",
              canReorder ? "border-border cursor-grab active:cursor-grabbing" : "border-border",
              dragVisitIndex === visitIndex && "ring-2 ring-primary/40"
            )}
          >
            {canReorder && (
              <GripVertical
                className="mt-2 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            )}
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-black text-neon">
              {row.index}
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-xs font-black uppercase leading-snug text-foreground">
                {item.title}
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{item.client}</p>
              {km && (
                <p className="mt-1 text-xs font-semibold text-primary-ink">
                  +{km} km · ~{Math.round(parseFloat(String(km)) * 2)} min
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              {canReorder && (
                <>
                  <button
                    type="button"
                    draggable={false}
                    disabled={visitIndex === 0}
                    onClick={() => onManualRouteReorder(visitIndex, visitIndex - 1)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Mover paragem para cima"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    draggable={false}
                    disabled={visitIndex >= stopCount - 1}
                    onClick={() => onManualRouteReorder(visitIndex, visitIndex + 1)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    aria-label="Mover paragem para baixo"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                draggable={false}
                onClick={() => toggleSelectionForRoute(item as RouteStop)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger-surface hover:text-danger-solid"
                aria-label="Remover paragem"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
  );
}