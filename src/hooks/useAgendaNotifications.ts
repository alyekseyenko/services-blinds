"use client";

import { useEffect, useRef } from "react";
import {
  diffAgendaSnapshots,
  diffPipelineSnapshots,
  formatAgendaDiffToast,
  type AgendaDiffEvent,
  type AgendaSnapshotItem,
  type PipelineSnapshotItem,
} from "@/lib/agendaDiff";
import {
  detectLateVisits,
  filterUnrecordedLateVisits,
  recordLateVisitNotifications,
} from "@/lib/agendaLateNotify";
import { filterFreshAgendaEvents } from "@/lib/agendaNotifyDedupe";
import { agendaKindToToastType } from "@/lib/agendaNotificationStyle";
import { filterOutLocalChanges } from "@/lib/agendaLocalChanges";
import {
  loadAgendaSnapshot,
  loadPipelineSnapshot,
  saveAgendaSnapshot,
  savePipelineSnapshot,
} from "@/lib/agendaSnapshotStorage";
import {
  agendaNotificationThreadKey,
  loadInAppNotifications,
  pushOrMergeAgendaInAppNotification,
} from "@/lib/inAppNotifications";
import {
  appendTimelineEvent,
  formatTimelinePathShort,
} from "@/lib/agendaVisitLifecycle";
import {
  bellDescriptionFallback,
  bellTitleForTimeline,
  buildVisitFromAgendaEvent,
  type AgendaNotificationVisit,
} from "@/lib/agendaNotificationPayload";
import type { ToastType } from "@/components/ui/ToastContext";

const MAX_TOASTS = 3;
const LATE_CHECK_INTERVAL_MS = 60_000;

type AgendaToastApi = Record<ToastType, (title: string, description?: string) => void>;

export type UseAgendaNotificationsOptions = {
  scope: string;
  /** Snapshot atual; `null` enquanto os dados ainda não estão prontos. */
  items: AgendaSnapshotItem[] | null;
  /** Dados de agenda válidos (fetch concluído sem erro bloqueante). */
  ready: boolean;
  toast: AgendaToastApi;
  pipelineItems?: PipelineSnapshotItem[] | null;
  /** Admin: deteção de visitas atrasadas no cliente. */
  enableLateDetection?: boolean;
};

function snapshotFingerprint(items: AgendaSnapshotItem[]): string {
  return JSON.stringify(
    items.map((i) => [
      i.id,
      i.dueAt,
      i.status,
      i.assigneeId ?? "",
      (i.onSiteOpportunityIds ?? []).join(","),
      i.statusNote ?? "",
      JSON.stringify(i.onSiteServices ?? []),
    ])
  );
}

function pipelineFingerprint(items: PipelineSnapshotItem[]): string {
  return JSON.stringify(items.map((p) => [p.opportunityId, p.stage]));
}

function threadKeyForEvent(event: AgendaDiffEvent): string {
  if (event.kind === "armazem_pronto" && event.opportunityId) {
    return `pipeline:${event.opportunityId}`;
  }
  return `task:${event.id}`;
}

function groupEventsByThread(events: AgendaDiffEvent[]): Map<string, AgendaDiffEvent[]> {
  const map = new Map<string, AgendaDiffEvent[]>();
  for (const event of events) {
    const key = threadKeyForEvent(event);
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  return map;
}

function mergeVisit(
  existing: AgendaNotificationVisit | undefined,
  event: AgendaDiffEvent
): AgendaNotificationVisit {
  const next = buildVisitFromAgendaEvent(event);
  return {
    clientName: next.clientName ?? existing?.clientName,
    nsi: next.nsi ?? existing?.nsi,
    visitTitle: next.visitTitle ?? existing?.visitTitle,
    technicianName: next.technicianName ?? existing?.technicianName,
    dueAtIso: next.dueAtIso ?? existing?.dueAtIso,
    serviceType: next.serviceType ?? existing?.serviceType,
  };
}

function shortPathForEvents(events: AgendaDiffEvent[]): string {
  return formatTimelinePathShort(
    events.map((e, i) => ({
      kind: e.kind,
      at: Date.now() - (events.length - i) * 1000,
      detail: e.detail,
    }))
  );
}

function emitThreadToast(toast: AgendaToastApi, threadEvents: AgendaDiffEvent[]): void {
  const last = threadEvents[threadEvents.length - 1];
  const { title, description } = formatAgendaDiffToast(last);
  const type = agendaKindToToastType(last.kind);
  const path =
    threadEvents.length > 1 ? shortPathForEvents(threadEvents) : "";
  const desc = path ? `${description} (${path})` : description;
  toast[type](title, desc);
}

function emitAgendaEvents(
  scope: string,
  events: ReturnType<typeof diffAgendaSnapshots>,
  toast: AgendaToastApi
): void {
  const afterLocal = filterOutLocalChanges(scope, events);
  const fresh = filterFreshAgendaEvents(scope, afterLocal);
  if (fresh.length === 0) return;

  const grouped = groupEventsByThread(fresh);
  const threads = Array.from(grouped.values());

  if (threads.length > MAX_TOASTS) {
    for (let i = 0; i < MAX_TOASTS; i++) {
      emitThreadToast(toast, threads[i]);
    }
    const hidden = threads.length - MAX_TOASTS;
    toast.info(
      "Alterações na agenda",
      `+${hidden} alteração${hidden === 1 ? "" : "ões"} adicionais no sininho.`
    );
  } else {
    for (const threadEvents of threads) {
      emitThreadToast(toast, threadEvents);
    }
  }

  const loadedSnapshot = loadInAppNotifications(scope);
  const now = Date.now();

  for (const [threadKey, threadEvents] of grouped) {
    const existing = loadedSnapshot.find(
      (n) => agendaNotificationThreadKey(n) === threadKey
    );
    let timeline = existing?.agendaTimeline ?? [];
    for (const event of threadEvents) {
      timeline = appendTimelineEvent(
        timeline,
        { kind: event.kind, detail: event.detail },
        now
      );
    }
    const last = threadEvents[threadEvents.length - 1];
    const visit = mergeVisit(existing?.visit, last);
    const title = bellTitleForTimeline(timeline);
    const description = bellDescriptionFallback(last);

    pushOrMergeAgendaInAppNotification(scope, {
      title,
      description,
      taskId: last.kind === "armazem_pronto" ? undefined : last.id,
      dueAtIso: last.dueAt,
      opportunityId: last.opportunityId,
      taskStatus: last.status,
      agendaKind: last.kind,
      visit,
      agendaTimeline: timeline,
      notificationKind: "agenda",
    });
  }
}

export function useAgendaNotifications({
  scope,
  items,
  ready,
  toast,
  pipelineItems = null,
  enableLateDetection = false,
}: UseAgendaNotificationsOptions): void {
  const lastProcessedRef = useRef<string>("");
  const lastPipelineRef = useRef<string>("");
  const itemsRef = useRef<AgendaSnapshotItem[] | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!scope || !ready || items === null || typeof window === "undefined") return;

    const fingerprint = snapshotFingerprint(items);
    if (fingerprint === lastProcessedRef.current) return;

    try {
      const previous = loadAgendaSnapshot(scope);
      if (previous === null) {
        saveAgendaSnapshot(scope, items);
        lastProcessedRef.current = fingerprint;
        if (pipelineItems) {
          savePipelineSnapshot(scope, pipelineItems);
          lastPipelineRef.current = pipelineFingerprint(pipelineItems);
        }
        return;
      }

      const rawEvents = diffAgendaSnapshots(previous, items);
      emitAgendaEvents(scope, rawEvents, toast);

      if (pipelineItems) {
        const prevPipeline = loadPipelineSnapshot(scope) ?? [];
        const pipelineEvents = diffPipelineSnapshots(prevPipeline, pipelineItems);
        if (pipelineEvents.length > 0) {
          emitAgendaEvents(scope, pipelineEvents, toast);
        }
        savePipelineSnapshot(scope, pipelineItems);
        lastPipelineRef.current = pipelineFingerprint(pipelineItems);
      }

      saveAgendaSnapshot(scope, items);
      lastProcessedRef.current = fingerprint;
    } catch (error) {
      console.warn("[useAgendaNotifications] snapshot/diff warning:", error);
      try {
        saveAgendaSnapshot(scope, items);
        lastProcessedRef.current = fingerprint;
        if (pipelineItems) {
          savePipelineSnapshot(scope, pipelineItems);
          lastPipelineRef.current = pipelineFingerprint(pipelineItems);
        }
      } catch {
        /* ignore */
      }
    }
  }, [scope, items, ready, toast, pipelineItems]);

  useEffect(() => {
    if (!enableLateDetection || !scope || !ready || typeof window === "undefined") return;

    const runLateCheck = () => {
      const current = itemsRef.current;
      if (!current || current.length === 0) return;
      const lateRaw = detectLateVisits(current, Date.now());
      const lateFresh = filterUnrecordedLateVisits(scope, lateRaw);
      if (lateFresh.length === 0) return;
      const afterLocal = filterOutLocalChanges(scope, lateFresh);
      const events = filterFreshAgendaEvents(scope, afterLocal);
      if (events.length === 0) return;
      emitAgendaEvents(scope, events, toast);
      recordLateVisitNotifications(scope, events);
    };

    runLateCheck();
    const interval = window.setInterval(runLateCheck, LATE_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enableLateDetection, scope, ready, toast]);
}
