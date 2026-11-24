import {
  agendaNotificationThreadKey,
  type InAppNotification,
} from "@/lib/inAppNotifications";

export const DESKTOP_PROMPT_STORAGE_PREFIX = "fieldops_desktop_notify_prompt_v1_";

export type DesktopNotifyRole = "admin" | "technician";

export function roleFromNotificationScope(scope: string): DesktopNotifyRole | null {
  if (scope.startsWith("admin_")) return "admin";
  if (scope.startsWith("tech_")) return "technician";
  return null;
}

export function isDesktopNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator;
}

export function desktopPromptDismissed(scope: string): boolean {
  if (typeof window === "undefined" || !scope) return true;
  try {
    return localStorage.getItem(`${DESKTOP_PROMPT_STORAGE_PREFIX}${scope}`) === "dismissed";
  } catch {
    return true;
  }
}

export function dismissDesktopPrompt(scope: string): void {
  if (typeof window === "undefined" || !scope) return;
  try {
    localStorage.setItem(`${DESKTOP_PROMPT_STORAGE_PREFIX}${scope}`, "dismissed");
  } catch {
    /* quota */
  }
}

export function clearDesktopPromptDismissed(scope: string): void {
  if (typeof window === "undefined" || !scope) return;
  try {
    localStorage.removeItem(`${DESKTOP_PROMPT_STORAGE_PREFIX}${scope}`);
  } catch {
    /* ignore */
  }
}

export function shouldOfferDesktopPrompt(scope: string): boolean {
  if (!scope || !isDesktopNotificationSupported()) return false;
  if (Notification.permission !== "default") return false;
  return !desktopPromptDismissed(scope);
}

export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!isDesktopNotificationSupported()) return "denied";
  return Notification.requestPermission();
}

export function buildAgendaNotificationDeepLink(
  role: DesktopNotifyRole,
  detail: { taskId?: string; opportunityId?: string; dueAtIso?: string }
): string {
  const base = role === "admin" ? "/admin" : "/dashboard";
  const params = new URLSearchParams();
  if (detail.taskId) params.set("bellTaskId", detail.taskId);
  if (detail.opportunityId) params.set("bellOpportunityId", detail.opportunityId);
  if (detail.dueAtIso) params.set("bellDueAt", detail.dueAtIso);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function parseAgendaNotificationDeepLink(
  search: string
): { taskId?: string; opportunityId?: string; dueAtIso?: string } | null {
  const params = new URLSearchParams(search);
  const taskId = params.get("bellTaskId")?.trim() || undefined;
  const opportunityId = params.get("bellOpportunityId")?.trim() || undefined;
  const dueAtIso = params.get("bellDueAt")?.trim() || undefined;
  if (!taskId && !opportunityId) return null;
  return { taskId, opportunityId, dueAtIso };
}

export function stripAgendaNotificationDeepLinkParams(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("bellTaskId");
  params.delete("bellOpportunityId");
  params.delete("bellDueAt");
  return params.toString();
}

export async function showDesktopAgendaNotification(
  scope: string,
  n: InAppNotification
): Promise<void> {
  if (!isDesktopNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (n.notificationKind === "observability") return;

  const role = roleFromNotificationScope(scope);
  if (!role) return;

  const registration = await navigator.serviceWorker.ready;
  const threadKey = agendaNotificationThreadKey(n) || n.id;
  const path = buildAgendaNotificationDeepLink(role, {
    taskId: n.taskId,
    opportunityId: n.opportunityId,
    dueAtIso: n.dueAtIso,
  });
  const url =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  await registration.showNotification(n.title, {
    body: (n.description || "Alteração na agenda").slice(0, 240),
    tag: `agenda-${threadKey}`,
    data: {
      url,
      scope,
      notificationId: n.id,
      taskId: n.taskId,
      opportunityId: n.opportunityId,
      dueAtIso: n.dueAtIso,
      role,
    },
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });
}