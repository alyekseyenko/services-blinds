import type { InAppNotification } from "@/lib/inAppNotifications";

export type NotificationActivateHandlers = {
  onInvestigate?: (notification: InAppNotification) => void;
  onOpenTaskOnMap?: (notification: InAppNotification) => void;
  onNavigateHref?: (href: string) => void;
  onDispatchOpenTask?: (detail: {
    taskId?: string;
    opportunityId?: string;
    dueAtIso?: string;
  }) => void;
};

/** Ordem de prioridade ao activar um cartão do sininho (puramente testável). */
export function runNotificationActivateSteps(
  n: InAppNotification,
  handlers: NotificationActivateHandlers
): void {
  if (n.href) {
    handlers.onNavigateHref?.(n.href);
    return;
  }
  if (handlers.onInvestigate && (n.taskId || n.opportunityId)) {
    handlers.onInvestigate(n);
    return;
  }
  if (handlers.onOpenTaskOnMap && (n.taskId || n.opportunityId)) {
    handlers.onOpenTaskOnMap(n);
    return;
  }
  if (n.taskId || n.opportunityId) {
    handlers.onDispatchOpenTask?.({
      taskId: n.taskId,
      opportunityId: n.opportunityId,
      dueAtIso: n.dueAtIso,
    });
  }
}