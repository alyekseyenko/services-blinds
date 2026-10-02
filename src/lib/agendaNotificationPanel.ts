import type { InAppNotification } from "@/lib/inAppNotifications";
import {
  migrateAgendaProgressToTimeline,
  notificationMatchesFilter,
  resolveVisitPhase,
  type AgendaTimelineEntry,
} from "@/lib/agendaVisitLifecycle";

export type AgendaNotificationFilter = "all" | "active" | "done" | "problems";

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
  if (filter === "all") return items;
  return items.filter((n) => {
    if (n.notificationKind === "observability") return true;
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
