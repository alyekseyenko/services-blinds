"use client";

import { Calendar, MapPin, PanelRightOpen } from "lucide-react";
import { MapInfoWindowShell } from "@/components/map/MapInfoWindowShell";
import { getServiceTypeColor, resolveServiceType } from "@/lib/techniciansConfig";
import {
  isNeedsSchedulingStage,
  isTaskCompleted,
  isTaskInProgress,
} from "@/lib/crm/contract";
import { isOnboardingDemoEntity } from "@/lib/onboarding/demoMapPin";
import { dispatchOnboardingDemoOpenFromMap } from "@/lib/onboarding/events";
import { dispatchOnboardingTourAction } from "@/lib/onboarding/tourActions";

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
  /** Durante o guia admin, permite abrir oportunidade fictícia. */
  allowOpenOnboardingDemo?: boolean;
}

export function MapMarkerInfoWindow({
  marker,
  onClose,
  onOpenDetails,
  onSchedule,
  routeSelectionMode = false,
  isInRoute = false,
  onToggleRoute,
  allowOpenOnboardingDemo = false,
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
  const isDemo = isOnboardingDemoEntity(marker);
  const demoOpenBlocked = isDemo && !allowOpenOnboardingDemo;

  return (
    <MapInfoWindowShell
      onClose={onClose}
      dataTour={isDemo ? "onboarding-demo-pin" : undefined}
    >
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
        {isDemo && (
          <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase text-primary">
            Exemplo do guia
          </span>
        )}
        {marker.stage && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-muted-foreground">
            {marker.stage}
          </span>
        )}
        {isTaskInProgress(marker.taskStatus) && (
          <span
            className="rounded-md border border-warning-border/60 bg-warning-surface px-2 py-0.5 text-xs font-black uppercase text-warning-fg dark:bg-ink/60 dark:text-warning-fg"
            data-tour="admin-opp-in-progress"
          >
            Em curso
          </span>
        )}
        {marker.hasScheduledTask &&
          !isTaskCompleted(marker.taskStatus) &&
          !isTaskInProgress(marker.taskStatus) && (
          <span className="rounded-md bg-success-surface px-2 py-0.5 text-xs font-bold uppercase text-success-fg dark:bg-success-surface dark:text-success-fg">
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
                ? "bg-danger-surface text-danger-fg dark:bg-ink/50 dark:text-danger-fg"
                : "bg-warning-surface text-warning-fg dark:bg-warning-surface dark:text-warning-fg"
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
          data-tour={isDemo ? "admin-demo-open-opportunity" : undefined}
          onClick={
            demoOpenBlocked
              ? undefined
              : () => {
                  if (isDemo && allowOpenOnboardingDemo) {
                    dispatchOnboardingTourAction("openAdminDemoOpportunity");
                    dispatchOnboardingDemoOpenFromMap();
                  }
                  onOpenDetails();
                }
          }
          disabled={demoOpenBlocked}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-xs font-bold uppercase text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PanelRightOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {isDemo ? "Abrir painel" : "Detalhes"}
        </button>
      </div>
    </MapInfoWindowShell>
  );
}
