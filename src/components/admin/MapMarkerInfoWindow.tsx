"use client";

import { Calendar, MapPin, PanelRightOpen } from "lucide-react";
import { MapInfoWindowShell } from "@/components/map/MapInfoWindowShell";
import { getServiceTypeColor, resolveServiceType } from "@/lib/techniciansConfig";
import { isNeedsSchedulingStage, isTaskCompleted } from "@/lib/crm/contract";

export interface MapMarkerOpportunity {
  id?: string;
  twentyId?: string;
  title: string;
  client?: string;
  company?: string;
  address?: string;
  nsi?: string;
  stage?: string;
  serviceType?: string | string[];
  hasScheduledTask?: boolean;
  taskStatus?: string;
  scheduledAt?: string | Date | null;
  technician?: string | null;
  coordinates?: [number, number] | null;
  delayAlert?: "red" | "orange" | null;
  delayDays?: number;
}

interface MapMarkerInfoWindowProps {
  marker: MapMarkerOpportunity;
  onClose: () => void;
  onOpenDetails: () => void;
  onSchedule?: () => void;
  routeSelectionMode?: boolean;
  isInRoute?: boolean;
  onToggleRoute?: () => void;
}

export function MapMarkerInfoWindow({
  marker,
  onClose,
  onOpenDetails,
  onSchedule,
  routeSelectionMode = false,
  isInRoute = false,
  onToggleRoute,
}: MapMarkerInfoWindowProps) {
  const serviceType = resolveServiceType(marker);
  const typeColors = getServiceTypeColor(serviceType || "GERAL");

  const canSchedule =
    isNeedsSchedulingStage(marker.stage) &&
    (!marker.hasScheduledTask || isTaskCompleted(marker.taskStatus));

  const scheduledLabel =
    marker.scheduledAt &&
    new Date(marker.scheduledAt).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const showSchedule = canSchedule && Boolean(onSchedule) && !routeSelectionMode;
  const showRouteToggle = routeSelectionMode && Boolean(onToggleRoute);

  return (
    <MapInfoWindowShell onClose={onClose}>
      <div className="mb-2 flex flex-wrap items-center justify-start gap-1.5">
        <span
          className="rounded-md border px-2 py-0.5 text-xs font-bold uppercase"
          style={{
            backgroundColor: typeColors.bg,
            color: typeColors.text,
            borderColor: `${typeColors.text}30`,
          }}
        >
          {typeColors.label}
        </span>
        {marker.stage && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-muted-foreground">
            {marker.stage}
          </span>
        )}
        {marker.hasScheduledTask && !isTaskCompleted(marker.taskStatus) && (
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            Agendado
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold leading-snug text-foreground">{marker.title}</h3>
        {marker.nsi && (
          <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            NSI #{marker.nsi}
          </span>
        )}
      </div>

      {marker.delayAlert && (
        <p className="mt-2">
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
              marker.delayAlert === "red"
                ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                : "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200"
            }`}
          >
            Aguarda há {marker.delayDays} dias
          </span>
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">{marker.client || marker.company}</p>

      {marker.address && (
        <p className="mt-2 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-left text-xs leading-snug text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span>{marker.address}</span>
        </p>
      )}

      {(scheduledLabel || marker.technician) && (
        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {scheduledLabel && (
            <p>
              Visita: <span className="font-semibold text-foreground">{scheduledLabel}</span>
            </p>
          )}
          {marker.technician && (
            <p>
              Técnico: <span className="font-semibold text-foreground">{marker.technician}</span>
            </p>
          )}
        </div>
      )}

      <div
        className={`mt-3 grid gap-2 ${
          showRouteToggle && showSchedule ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {showRouteToggle && (
          <button
            type="button"
            onClick={onToggleRoute}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold uppercase ${
              isInRoute
                ? "border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isInRoute ? "Remover" : "Na rota"}
          </button>
        )}
        {showSchedule && (
          <button
            type="button"
            onClick={onSchedule}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-xs font-bold uppercase text-primary-foreground"
          >
            <Calendar className="h-4 w-4 shrink-0" aria-hidden />
            Agendar
          </button>
        )}
        <button
          type="button"
          onClick={onOpenDetails}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-xs font-bold uppercase text-foreground hover:bg-muted"
        >
          <PanelRightOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Detalhes
        </button>
      </div>
    </MapInfoWindowShell>
  );
}
