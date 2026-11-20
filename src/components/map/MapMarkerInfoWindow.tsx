"use client";

import { Calendar, MapPin, PanelRightOpen } from "lucide-react";
import { MapInfoWindowShell } from "@/components/map/MapInfoWindowShell";
import { getServiceTypeColor, resolveServiceType } from "@/lib/techniciansConfig";
import {
  isNeedsSchedulingStage,
  isTaskCompleted,
  isTaskInProgress,
} from "@/lib/crm/contract";

export interface MapMarkerOpportunity {
  id?: string;
  twentyId?: string;
  title: string;
  client?: string;
  company?: string;
  address?: string;
  nsi?: string;
  serviceNumber?: string;
  stage?: string;
  serviceType?: string | string[];
  hasScheduledTask?: boolean;
  taskStatus?: string;
  scheduledAt?: string | Date | null;
  technician?: string | null;
  coordinates?: [number, number] | null;
  delayAlert?: "red" | "orange" | null;
  delayDays?: number;
  pointOfContactPhone?: string;
  pointOfContactPhones?: string[];
  clientNif?: string | null;
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

  const clientName = [marker.client, marker.company]
    .map((value) => value?.trim())
    .find((value) => value && value !== "Cliente");
  const headline =
    clientName ||
    marker.title.replace(/\s*\[[^\]]+\]\s*$/, "").trim() ||
    "Serviço";
  const technicianName =
    marker.technician && !/não atribuído/i.test(marker.technician.trim())
      ? marker.technician.trim()
      : null;
  const identifiers = [
    marker.serviceNumber ? `N.º ${marker.serviceNumber}` : null,
    marker.nsi && marker.nsi !== "N/A" ? `NSI ${marker.nsi}` : null,
  ].filter((value): value is string => Boolean(value));
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
        {isTaskInProgress(marker.taskStatus) && (
          <span className="rounded-md border border-warning-border/60 bg-warning-surface px-2 py-0.5 text-xs font-black uppercase text-warning-fg dark:bg-ink/60 dark:text-warning-fg">
            Em curso
          </span>
        )}
      </div>

      <h3 className="text-sm font-bold leading-snug text-foreground">{headline}</h3>
      {identifiers.length > 0 ? (
        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{identifiers.join(" · ")}</p>
      ) : null}

      {marker.delayAlert && (
        <p className="mt-2">
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
              marker.delayAlert === "red"
                ? "bg-danger-surface text-danger-fg dark:bg-ink/50 dark:text-danger-fg"
                : "bg-warning-surface text-warning-fg dark:bg-warning-surface dark:text-warning-fg"
            }`}
          >
            Aguarda há {marker.delayDays} dias
          </span>
        </p>
      )}

      {marker.address && (
        <p className="mt-2 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-left text-xs leading-snug text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span>{marker.address}</span>
        </p>
      )}

      {(scheduledLabel || technicianName) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {[scheduledLabel, technicianName].filter(Boolean).join(" · ")}
        </p>
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
                ? "border border-warning-border bg-warning-surface text-warning-fg dark:border-warning-border dark:bg-ink/40 dark:text-warning-fg"
                : "bg-info-solid text-ink-foreground hover:bg-info-solid/90"
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
