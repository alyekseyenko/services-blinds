import type { AgendaDiffKind } from "@/lib/agendaDiff";
import {
  migrateAgendaProgressToTimeline,
  type AgendaTimelineEntry,
} from "@/lib/agendaVisitLifecycle";
import { InAppNotificationSchema } from "@/lib/schemas/inAppNotification";
import type { AgendaNotificationVisit } from "@/lib/agendaNotificationPayload";

export type { AgendaTimelineEntry };

export type InAppNotification = {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  read: boolean;
  /** Visita no CRM — permite abrir no mapa (técnico). */
  taskId?: string;
  dueAtIso?: string;
  opportunityId?: string;
  taskStatus?: string;
  agendaKind?: AgendaDiffKind;
  agendaProgress?: AgendaDiffKind[];
  visit?: AgendaNotificationVisit;
  agendaTimeline?: AgendaTimelineEntry[];
  notificationKind?: "agenda" | "observability";
  href?: string;
};

const VISIT_CARD_MERGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isAgendaInAppNotification(n: InAppNotification): boolean {
  return n.notificationKind !== "observability";
}

/** Chave da “thread” de uma visita no sininho (um cartão por visita). */
export function agendaNotificationThreadKey(entry: {
  taskId?: string;
  opportunityId?: string;
  agendaKind?: AgendaDiffKind;
}): string | null {
  if (entry.taskId) return `task:${entry.taskId}`;
  if (entry.agendaKind === "armazem_pronto" && entry.opportunityId) {
    return `pipeline:${entry.opportunityId}`;
  }
  return null;
}

export const IN_APP_NOTIFICATION_OPEN_TASK_EVENT = "app:inapp-notification-open-task";

export type InAppNotificationOpenTaskDetail = {
  taskId: string;
  dueAtIso?: string;
};

export const LEGACY_ADMIN_NOTIFICATION_SCOPE = "admin_member";
export const LEGACY_TECH_NOTIFICATION_SCOPE = "technician";

export function getNotificationScope(
  role: "technician" | "admin",
  userId?: string | null
): string {
  if (role === "technician") {
    return userId ? `tech_${userId}` : LEGACY_TECH_NOTIFICATION_SCOPE;
  }
  return userId ? `admin_${userId}` : LEGACY_ADMIN_NOTIFICATION_SCOPE;
}

function mergeNotificationLists(
  primary: InAppNotification[],
  secondary: InAppNotification[]
): InAppNotification[] {
  const byId = new Map<string, InAppNotification>();
  for (const n of [...secondary, ...primary]) {
    const existing = byId.get(n.id);
    if (!existing || n.createdAt > existing.createdAt) {
      byId.set(n.id, n);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, ADMIN_NOTIFICATION_CAP);
}

/** Move avisos do scope legado (sem id de sessão) para o scope do utilizador. */
export function migrateLegacyInAppNotificationScope(canonicalScope: string): void {
  if (typeof window === "undefined" || !canonicalScope) return;

  const legacyScope =
    canonicalScope.startsWith("admin_") && canonicalScope !== LEGACY_ADMIN_NOTIFICATION_SCOPE
      ? LEGACY_ADMIN_NOTIFICATION_SCOPE
      : canonicalScope.startsWith("tech_")
        ? LEGACY_TECH_NOTIFICATION_SCOPE
        : null;

  if (!legacyScope) return;

  try {
    const legacyRaw = localStorage.getItem(storageKey(legacyScope));
    if (!legacyRaw) return;

    const legacyItems = parseNotificationList(JSON.parse(legacyRaw));
    if (legacyItems.length === 0) {
      localStorage.removeItem(storageKey(legacyScope));
      return;
    }

    const canonicalItems = parseNotificationList(
      JSON.parse(localStorage.getItem(storageKey(canonicalScope)) ?? "[]")
    );
    const merged = mergeNotificationLists(canonicalItems, legacyItems);
    saveInAppNotifications(canonicalScope, merged);
    localStorage.removeItem(storageKey(legacyScope));
    notifyInAppListeners(canonicalScope);
  } catch {
    /* ignore corrupt storage */
  }
}

export function dispatchOpenTaskFromNotification(detail: InAppNotificationOpenTaskDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<InAppNotificationOpenTaskDetail>(IN_APP_NOTIFICATION_OPEN_TASK_EVENT, {
      detail,
    })
  );
}

function isTechnicianScope(scope: string): boolean {
  return scope.startsWith("tech_");
}

function isAdminNotificationScope(scope: string): boolean {
  return scope.startsWith("admin_");
}

const TECH_NOTIFICATION_CAP = 20;
const ADMIN_NOTIFICATION_CAP = 50;

function notificationCapForScope(scope: string): number {
  if (isTechnicianScope(scope)) return TECH_NOTIFICATION_CAP;
  if (isAdminNotificationScope(scope)) return ADMIN_NOTIFICATION_CAP;
  return TECH_NOTIFICATION_CAP;
}

function isSameLocalDay(ts: number, ref = new Date()): boolean {
  return new Date(ts).toDateString() === ref.toDateString();
}

function normalizeStoredNotification(n: InAppNotification): InAppNotification {
  if (n.agendaTimeline?.length) return n;
  if (n.agendaProgress?.length) {
    return {
      ...n,
      agendaTimeline: migrateAgendaProgressToTimeline(n.agendaProgress, n.createdAt),
    };
  }
  if (n.agendaKind) {
    return {
      ...n,
      agendaTimeline: [{ kind: n.agendaKind, at: n.createdAt }],
    };
  }
  return n;
}

function parseNotificationList(raw: unknown): InAppNotification[] {
  if (!Array.isArray(raw)) return [];
  const items: InAppNotification[] = [];
  for (const entry of raw) {
    const parsed = InAppNotificationSchema.safeParse(entry);
    if (parsed.success) items.push(normalizeStoredNotification(parsed.data));
  }
  return items;
}

/** Técnico: só avisos de hoje na lista e no contador. */
export function pruneAndFilterNotificationsForDisplay(
  scope: string,
  items: InAppNotification[]
): InAppNotification[] {
  if (!isTechnicianScope(scope)) return items;
  const today = items.filter((n) => isSameLocalDay(n.createdAt));
  if (today.length !== items.length) {
    saveInAppNotifications(scope, today);
  }
  return today;
}

const STORAGE_PREFIX = "fieldops_inapp_notifications_v1_";

export const IN_APP_NOTIFICATIONS_UPDATED_EVENT = "app:inapp-notifications-updated";

function notifyInAppListeners(scope: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(IN_APP_NOTIFICATIONS_UPDATED_EVENT, { detail: { scope } })
  );
}

function storageKey(scope: string): string {
  return `${STORAGE_PREFIX}${scope}`;
}

export function loadInAppNotifications(scope: string): InAppNotification[] {
  if (typeof window === "undefined") return [];
  if (
    scope.startsWith("admin_") &&
    scope !== LEGACY_ADMIN_NOTIFICATION_SCOPE
  ) {
    migrateLegacyInAppNotificationScope(scope);
  } else if (scope.startsWith("tech_")) {
    migrateLegacyInAppNotificationScope(scope);
  }
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return [];
    const items = parseNotificationList(JSON.parse(raw));
    return pruneAndFilterNotificationsForDisplay(scope, items);
  } catch {
    return [];
  }
}

export function saveInAppNotifications(scope: string, items: InAppNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(items.slice(0, notificationCapForScope(scope))));
  } catch {
    /* ignore quota */
  }
}

export function pushInAppNotification(
  scope: string,
  entry: Omit<InAppNotification, "id" | "createdAt" | "read">
): InAppNotification[] {
  const next: InAppNotification = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    read: false,
  };
  const cap = notificationCapForScope(scope);
  const items = [next, ...loadInAppNotifications(scope)].slice(0, cap);
  saveInAppNotifications(scope, items);
  notifyInAppListeners(scope);
  return items;
}

/**
 * Sininho da agenda: um cartão por visita (lido ou não); sobe ao topo e volta a “por ler”.
 */
export function pushOrMergeAgendaInAppNotification(
  scope: string,
  entry: Omit<InAppNotification, "id" | "createdAt" | "read">
): InAppNotification[] {
  const threadKey = agendaNotificationThreadKey(entry);
  if (!threadKey || !isAgendaInAppNotification(entry as InAppNotification)) {
    return pushInAppNotification(scope, entry);
  }

  const loaded = loadInAppNotifications(scope);
  const existingIdx = loaded.findIndex(
    (n) =>
      isAgendaInAppNotification(n) && agendaNotificationThreadKey(n) === threadKey
  );

  const now = Date.now();

  if (existingIdx < 0) {
    return pushInAppNotification(scope, entry);
  }

  const existing = loaded[existingIdx];
  if (now - existing.createdAt > VISIT_CARD_MERGE_MAX_AGE_MS) {
    return pushInAppNotification(scope, entry);
  }

  const merged: InAppNotification = {
    ...existing,
    title: entry.title,
    description: entry.description,
    dueAtIso: entry.dueAtIso ?? existing.dueAtIso,
    opportunityId: entry.opportunityId ?? existing.opportunityId,
    taskStatus: entry.taskStatus ?? existing.taskStatus,
    agendaKind: entry.agendaKind ?? existing.agendaKind,
    agendaProgress: entry.agendaProgress ?? existing.agendaProgress,
    visit: entry.visit
      ? {
          ...existing.visit,
          ...entry.visit,
          serviceType: entry.visit.serviceType ?? existing.visit?.serviceType,
        }
      : existing.visit,
    agendaTimeline: entry.agendaTimeline ?? existing.agendaTimeline,
    createdAt: now,
    read: false,
  };

  const rest = loaded.filter((_, i) => i !== existingIdx);
  const cap = notificationCapForScope(scope);
  const items = [merged, ...rest].slice(0, cap);
  saveInAppNotifications(scope, items);
  notifyInAppListeners(scope);
  return items;
}

export function markAllInAppNotificationsRead(scope: string): InAppNotification[] {
  const items = loadInAppNotifications(scope).map((n) => ({ ...n, read: true }));
  saveInAppNotifications(scope, items);
  notifyInAppListeners(scope);
  return items;
}

export function markInAppNotificationRead(scope: string, id: string): InAppNotification[] {
  const items = loadInAppNotifications(scope).map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  saveInAppNotifications(scope, items);
  notifyInAppListeners(scope);
  return items;
}

export function unreadInAppCount(scope: string): number {
  return loadInAppNotifications(scope).filter((n) => !n.read).length;
}

export function partitionInAppNotifications(items: InAppNotification[]): {
  unread: InAppNotification[];
  read: InAppNotification[];
} {
  const unread: InAppNotification[] = [];
  const read: InAppNotification[] = [];
  for (const n of items) {
    if (n.read) read.push(n);
    else unread.push(n);
  }
  const byNewest = (a: InAppNotification, b: InAppNotification) => b.createdAt - a.createdAt;
  unread.sort(byNewest);
  read.sort(byNewest);
  return { unread, read };
}
