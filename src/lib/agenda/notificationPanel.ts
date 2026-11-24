import type { InAppNotification } from "@/lib/inAppNotifications";
import {
  migrateAgendaProgressToTimeline,
  notificationMatchesFilter,
  resolveVisitPhase,
  type AgendaTimelineEntry,
} from "@/lib/agenda/visitLifecycle";

export type AgendaNotificationFilter = "all" | "active" | "done" | "problems";

export function isAgendaOperationalNotification(n: InAppNotification): boolean {
  return n.notificationKind !== "observability";
}

export function partitionAgendaAndSystemNotifications(items: InAppNotification[]): {
  agendaItems: InAppNotification[];
  systemItems: InAppNotification[];
} {
  const agendaItems: InAppNotification[] = [];
  const systemItems: InAppNotification[] = [];
  for (const n of items) {
    if (n.notificationKind === "observability") systemItems.push(n);
    else agendaItems.push(n);
  }
  agendaItems.sort((a, b) => b.createdAt - a.createdAt);
  systemItems.sort((a, b) => b.createdAt - a.createdAt);
  return { agendaItems, systemItems };
}

export function resolveNotificationTimeline(n: InAppNotification): AgendaTimelineEntry[] {
  if (n.agendaTimeline?.length) return n.agendaTimeline;
  if (n.agendaProgress?.length) {
    return migrateAgendaProgressToTimeline(n.agendaProgress, n.createdAt);
  }
  if (n.agendaKind) return [{ kind: n.agendaKind, at: n.createdAt }];
  return [];
}

export function filterInAppNotifications(
  items: InAppNotification[],
  filter: AgendaNotificationFilter
): InAppNotification[] {
  const operational = items.filter(isAgendaOperationalNotification);
  if (filter === "all") return operational;
  return operational.filter((n) => {
    const phase = resolveVisitPhase(resolveNotificationTimeline(n)).phase;
    return notificationMatchesFilter(phase, filter);
  });
}

function dayBucket(ts: number, ref = new Date()): "today" | "yesterday" | "older" {
  const d = new Date(ts);
  if (d.toDateString() === ref.toDateString()) return "today";
  const yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "yesterday";
  return "older";
}

export type NotificationDayGroup = {
  id: "today" | "yesterday" | "older";
  label: string;
  items: InAppNotification[];
};

const DAY_LABEL_PT: Record<NotificationDayGroup["id"], string> = {
  today: "Hoje",
  yesterday: "Ontem",
  older: "Anteriores",
};

export function groupInAppNotificationsByDay(
  items: InAppNotification[]
): NotificationDayGroup[] {
  const buckets: Record<NotificationDayGroup["id"], InAppNotification[]> = {
    today: [],
    yesterday: [],
    older: [],
  };
  for (const n of items) {
    buckets[dayBucket(n.createdAt)].push(n);
  }
  const order: NotificationDayGroup["id"][] = ["today", "yesterday", "older"];
  return order
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({
      id,
      label: DAY_LABEL_PT[id],
      items: buckets[id].sort((a, b) => b.createdAt - a.createdAt),
    }));
}
