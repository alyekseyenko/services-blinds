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
  Star,
  XCircle,
  Check,
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
import {
  buildAgendaNotificationHeadline,
  buildAgendaNotificationSubtitle,
  visitServiceTypeLabel,
} from "@/lib/agendaNotificationPayload";
import { resolveTimelineEntryDetail } from "@/lib/agendaTimelineCopy";
import {
  isVisitDueBeforeToday,
  PENDING_CLOSURE_BELL_NOTE_PT,
} from "@/lib/visitPendingClosure";
import { StatusChip } from "@/components/ui/StatusChip";
import { DS_ACCENT_CLASS, visitPhaseToTone } from "@/lib/design/tones";

type AgendaVisitNotificationCardProps = {
  notification: InAppNotification;
  spacious?: boolean;
  actionLabel: string;
  onActivate: () => void;
  onMarkRead?: () => void;
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
    case "avaliacao":
      return Star;
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
  onMarkRead,
}: AgendaVisitNotificationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const actionable = Boolean(n.taskId || n.opportunityId || n.href);
  const timeline = resolveNotificationTimeline(n);
  const { phase, label: phaseLabel } = resolveVisitPhase(timeline);
  const PhaseIcon = phaseIcon(phase);
  const tone = visitPhaseToTone(phase);

  const visit = n.visit;
  const headline = buildAgendaNotificationHeadline(visit);
  const titleLine = buildAgendaNotificationSubtitle(visit);
  const scheduled = formatScheduled(visit?.dueAtIso ?? n.dueAtIso);
  const techName = visit?.technicianName?.trim();
  const legacyDesc = stripLegacyAgendaProgressFromDescription(n.description);
  const serviceTypeLabel = visitServiceTypeLabel(visit);
  const dueIso = visit?.dueAtIso ?? n.dueAtIso;
  const priorDayPendingClosure =
    isVisitDueBeforeToday(dueIso) &&
    (phase === "cancelada" || phase === "incompleta" || phase === "concluida");

  const visibleTimeline = expanded ? timeline : timeline.slice(-3);
  const hiddenCount = timeline.length - visibleTimeline.length;

  const cardLabel =
    visit?.urgent
      ? n.read
        ? "Urgente — já visto"
        : "Urgente — novo"
      : n.read
        ? `${phaseLabel} — já visto`
        : `${phaseLabel} — novo`;

  return (
    <div
      role={actionable ? "button" : undefined}
      tabIndex={actionable ? 0 : undefined}
      onClick={actionable ? onActivate : undefined}
      onKeyDown={
        actionable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
      className={cn(
        "ds-panel flex w-full flex-col border border-l-4 text-left transition-colors",
        visit?.urgent
          ? "border-2 border-danger-solid bg-danger-surface"
          : cn("border-border/90", DS_ACCENT_CLASS[tone]),
        actionable && "cursor-pointer hover:bg-muted/80 active:scale-[0.995]",
        spacious ? "gap-3 p-4" : "gap-2 p-3"
      )}
      aria-label={cardLabel}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <StatusChip label={phaseLabel} tone={tone} icon={<PhaseIcon className="h-3.5 w-3.5" />} />
            {visit?.urgent ? (
              <StatusChip label="Urgente" tone="danger" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            ) : null}
            {serviceTypeLabel ? (
              <StatusChip label={serviceTypeLabel} tone="neutral" className="max-w-[10rem] truncate" />
            ) : null}
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {formatRelativeTime(n.createdAt)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!n.read && onMarkRead ? (
            <button
              type="button"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-info-fg hover:bg-muted active:bg-muted"
              aria-label="Marcar como lido"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
            >
              <Check className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
          {!n.read && (
            <span
              className="h-2.5 w-2.5 rounded-full bg-primary shadow-[var(--shadow-glow-primary)]"
              aria-hidden
            />
          )}
        </div>
      </div>

      {(headline || n.title) && (
        <p
          className={cn(
            "line-clamp-2 font-semibold leading-snug text-foreground",
            spacious ? "text-base" : "text-sm"
          )}
        >
          {headline || n.title}
        </p>
      )}

      {titleLine && (
        <p className="truncate text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
          {titleLine}
        </p>
      )}

      {!titleLine && !headline && legacyDesc && (
        <p className="line-clamp-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
          {legacyDesc}
        </p>
      )}

      {priorDayPendingClosure && (
        <p className="text-xs font-semibold text-warning-fg">{PENDING_CLOSURE_BELL_NOTE_PT}</p>
      )}

      {(techName || scheduled) && (
        <div className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          {techName && (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground"
                aria-hidden
              >
                {technicianInitials(techName)}
              </span>
              <span className="truncate">{techName}</span>
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
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Novo agendamento
                  </p>
                )}
                <div className="flex gap-2 text-xs">
                <span className="ds-num w-10 shrink-0 text-xs text-muted-foreground">
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
              className="mt-2 text-xs font-bold uppercase tracking-wide text-info-solid dark:text-info-fg"
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
    </div>
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
