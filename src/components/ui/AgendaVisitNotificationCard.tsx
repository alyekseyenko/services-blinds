"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  MapPin,
  Package,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { InAppNotification } from "@/lib/inAppNotifications";
import {
  resolveNotificationTimeline,
} from "@/lib/agendaNotificationPanel";
import {
  resolveVisitPhase,
  timelineKindLabelPt,
  type VisitPhaseId,
} from "@/lib/agendaVisitLifecycle";
import { stripLegacyAgendaProgressFromDescription } from "@/lib/agendaNotificationBellCopy";
import { visitServiceTypeLabel } from "@/lib/agendaNotificationPayload";
import { resolveTimelineEntryDetail } from "@/lib/agendaTimelineCopy";
import { StatusChip } from "@/components/ui/StatusChip";
import { DS_ACCENT_CLASS, visitPhaseToTone } from "@/lib/design/tones";

type AgendaVisitNotificationCardProps = {
  notification: InAppNotification;
  spacious?: boolean;
  actionLabel: string;
  onActivate: () => void;
};

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}

function formatScheduled(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
  const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

function technicianInitials(name?: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function phaseIcon(phase: VisitPhaseId) {
  switch (phase) {
    case "concluida":
    case "armazem":
      return CheckCircle2;
    case "cancelada":
      return XCircle;
    case "incompleta":
    case "atrasada":
    case "saiu":
      return AlertTriangle;
    case "em_curso":
      return PlayCircle;
    default:
      return Clock;
  }
}

function formatTimelineTime(at: number): string {
  return new Date(at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export function AgendaVisitNotificationCard({
  notification: n,
  spacious = false,
  actionLabel,
  onActivate,
}: AgendaVisitNotificationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const actionable = Boolean(n.taskId || n.opportunityId || n.href);
  const timeline = resolveNotificationTimeline(n);
  const { phase, label: phaseLabel } = resolveVisitPhase(timeline);
  const PhaseIcon = phaseIcon(phase);
  const tone = visitPhaseToTone(phase);

  const visit = n.visit;
  const clientLine = [visit?.clientName, visit?.nsi ? `NSI ${visit.nsi}` : null]
    .filter(Boolean)
    .join(" · ");
  const titleLine = visit?.visitTitle?.trim();
  const scheduled = formatScheduled(visit?.dueAtIso ?? n.dueAtIso);
  const techName = visit?.technicianName?.trim();
  const legacyDesc = stripLegacyAgendaProgressFromDescription(n.description);
  const serviceTypeLabel = visitServiceTypeLabel(visit);

  const visibleTimeline = expanded ? timeline : timeline.slice(-3);
  const hiddenCount = timeline.length - visibleTimeline.length;

  return (
    <button
      type="button"
      disabled={!actionable}
      onClick={onActivate}
      className={cn(
        "ds-panel flex w-full flex-col border border-l-4 border-border/90 text-left transition-colors",
        DS_ACCENT_CLASS[tone],
        actionable && "hover:bg-muted/80 active:scale-[0.995]",
        spacious ? "gap-3 p-4" : "gap-2 p-3"
      )}
      aria-label={n.read ? `${phaseLabel} — já visto` : `${phaseLabel} — novo`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusChip label={phaseLabel} tone={tone} icon={<PhaseIcon className="h-3.5 w-3.5" />} />
          {serviceTypeLabel ? (
            <StatusChip label={serviceTypeLabel} tone="neutral" className="max-w-[11rem]" />
          ) : null}
          <span className="text-xs font-semibold text-muted-foreground">
            {formatRelativeTime(n.createdAt)}
          </span>
        </div>
        {!n.read && (
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[var(--shadow-glow-primary)]"
            aria-hidden
          />
        )}
      </div>

      {clientLine ? (
        <p className={cn("font-black text-foreground dark:text-foreground", spacious ? "text-base" : "text-sm")}>
          {clientLine}
        </p>
      ) : (
        <p className={cn("font-black text-foreground dark:text-foreground", spacious ? "text-base" : "text-sm")}>
          {n.title}
        </p>
      )}

      {titleLine && (
        <p className="truncate text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
          {titleLine}
        </p>
      )}

      {!titleLine && !visit?.clientName && legacyDesc && (
        <p className="line-clamp-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
          {legacyDesc}
        </p>
      )}

      {(techName || scheduled) && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
          {techName && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-black text-muted-foreground dark:bg-muted"
                aria-hidden
              >
                {technicianInitials(techName)}
              </span>
              {techName}
            </span>
          )}
          {scheduled && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {scheduled}
            </span>
          )}
        </div>
      )}

      {timeline.length > 0 && (
        <div className="mt-1 border-t border-border pt-2 dark:border-border">
          <ol className="space-y-1.5" aria-label="Histórico da visita">
            {visibleTimeline.map((entry, index) => {
              const detail = resolveTimelineEntryDetail(entry, techName);
              return (
              <li key={`${entry.kind}-${entry.at}-${index}`} className="space-y-1">
                {entry.cycleBreak && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Novo agendamento
                  </p>
                )}
                <div className="flex gap-2 text-xs">
                <span className="ds-num w-10 shrink-0 text-[10px] text-muted-foreground">
                  {formatTimelineTime(entry.at)}
                </span>
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground dark:text-foreground">
                    {timelineKindLabelPt(entry.kind)}
                  </p>
                  {detail ? (
                    <p className="text-muted-foreground dark:text-muted-foreground">{detail}</p>
                  ) : null}
                </div>
                </div>
              </li>
              );
            })}
          </ol>
          {hiddenCount > 0 && !expanded && (
            <button
              type="button"
              className="mt-2 text-[10px] font-bold uppercase tracking-wider text-info-solid dark:text-info-fg"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
            >
              Ver fluxo completo (+{hiddenCount})
            </button>
          )}
        </div>
      )}

      {actionable && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-black uppercase tracking-wider text-info-fg">
            {phase === "armazem" ? (
              <span className="inline-flex items-center gap-1">
                <Package className="h-3.5 w-3.5" aria-hidden />
                {actionLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {actionLabel}
              </span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      )}
    </button>
  );
}

export function ObservabilityNotificationCard({
  notification: n,
  spacious,
  onActivate,
}: {
  notification: InAppNotification;
  spacious?: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        "ds-panel flex w-full items-start gap-2 border border-l-4 ds-accent-warning bg-warning-surface p-3 text-left",
        spacious && "p-4"
      )}
    >
      <Circle className="mt-0.5 h-4 w-4 text-warning-solid" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-warning-fg">{n.title}</p>
        <p className="text-xs font-semibold text-warning-fg opacity-90">
          {n.description}
        </p>
      </div>
    </button>
  );
}
