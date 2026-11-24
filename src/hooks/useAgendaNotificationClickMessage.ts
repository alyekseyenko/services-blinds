"use client";

import { useEffect, useRef } from "react";
import {
  dispatchActivateInAppNotification,
  type InAppNotificationOpenTaskDetail,
} from "@/lib/inAppNotifications";

type SwAgendaClickMessage = {
  type?: string;
  detail?: {
    taskId?: string;
    opportunityId?: string;
    dueAtIso?: string;
    notificationId?: string;
    scope?: string;
  };
};

/**
 * Quando o utilizador clica numa notificação do Windows com a PWA já aberta.
 */
export function useAgendaNotificationClickMessage(params: {
  scope: string;
  onOpenTask: (detail: InAppNotificationOpenTaskDetail) => void;
}): void {
  const { scope, onOpenTask } = params;
  const onOpenRef = useRef(onOpenTask);
  onOpenRef.current = onOpenTask;

  useEffect(() => {
    if (!scope || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent<SwAgendaClickMessage>) => {
      const msg = event.data;
      if (!msg || msg.type !== "AGENDA_NOTIFICATION_CLICK") return;
      const detail = msg.detail;
      if (!detail) return;
      if (detail.scope && detail.scope !== scope) return;
      if (!detail.taskId && !detail.opportunityId) return;

      if (detail.notificationId) {
        dispatchActivateInAppNotification(scope, detail.notificationId);
        return;
      }

      onOpenRef.current({
        taskId: detail.taskId,
        opportunityId: detail.opportunityId,
        dueAtIso: detail.dueAtIso,
      });
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [scope]);
}