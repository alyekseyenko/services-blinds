"use client";

import { AlertTriangle, PanelRightOpen } from "lucide-react";
import NavigationChooser from "@/components/dashboard/NavigationChooser";
import { MapInfoWindowShell } from "@/components/map/MapInfoWindowShell";
import { getServiceTypeColor, resolveServiceType } from "@/lib/techniciansConfig";
import { resolveTaskOverdue } from "@/lib/taskUtils";
import { isOnboardingDemoEntity } from "@/lib/onboarding/demoMapPin";
import { dispatchOnboardingDemoOpenFromMap } from "@/lib/onboarding/events";
import { dispatchOnboardingTourAction } from "@/lib/onboarding/tourActions";

export interface TaskMapOpportunity {
  id?: string;
  title: string;
  client?: string;
  company?: string;
  address?: string;
  dueDate?: string | Date | null;
  scheduledAt?: string | Date | null;
  status?: string;
  taskStatus?: string;
  coordinates?: [number, number] | null;
  serviceType?: string | string[];
}

interface TaskMapInfoWindowProps {
  task: TaskMapOpportunity;
  onClose: () => void;
  onOpenVisit: () => void;
  /** Durante o guia, permite abrir a visita fictícia. */
  allowOpenOnboardingDemo?: boolean;
}

export function TaskMapInfoWindow({ task, onClose, onOpenVisit, allowOpenOnboardingDemo = false }: TaskMapInfoWindowProps) {
  const serviceType = resolveServiceType(task);
  const typeColors = getServiceTypeColor(serviceType || "GERAL");
  const isLate = resolveTaskOverdue({
    status: task.status ?? task.taskStatus,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    dueAt: task.scheduledAt ?? task.dueDate ?? undefined,
  });

  const when = task.scheduledAt || task.dueDate;
  const timeLabel =
    when &&
    new Date(when).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isDemo = isOnboardingDemoEntity(task);
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
        {isLate && (
          <span className="inline-flex items-center gap-1 rounded-md bg-warning-surface px-2 py-0.5 text-xs font-bold uppercase text-warning-fg dark:bg-ink/60 dark:text-warning-fg">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Atrasada
          </span>
        )}
      </div>

      <h3 className="text-sm font-bold leading-snug text-foreground">
        {task.client || task.company || task.title}
      </h3>

      {timeLabel && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Hora: <span className="font-semibold text-foreground">{timeLabel}</span>
        </p>
      )}

      {task.address && (
        <p className="mt-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-xs leading-snug text-muted-foreground">
          {task.address}
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2">
        <button
          type="button"
          data-tour={isDemo ? "tech-demo-open-visit" : undefined}
          onClick={
            demoOpenBlocked
              ? undefined
              : () => {
                  if (isDemo && allowOpenOnboardingDemo) {
                    dispatchOnboardingTourAction("openDemoVisit");
                    dispatchOnboardingDemoOpenFromMap();
                  }
                  onOpenVisit();
                }
          }
          disabled={demoOpenBlocked}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-xs font-bold uppercase tracking-wide text-primary-foreground hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PanelRightOpen className="h-4 w-4 shrink-0" aria-hidden />
          Abrir visita
        </button>
        {task.address && (
          <NavigationChooser
            address={task.address}
            coordinates={task.coordinates}
            label="Navegar"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-bold uppercase tracking-wide text-foreground hover:bg-muted"
          />
        )}
      </div>
    </MapInfoWindowShell>
  );
}
