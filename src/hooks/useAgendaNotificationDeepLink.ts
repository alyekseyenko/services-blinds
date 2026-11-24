"use client";

import { useEffect, useRef } from "react";
import {
  parseAgendaNotificationDeepLink,
  stripAgendaNotificationDeepLinkParams,
} from "@/lib/agenda/desktopNotifications";
import type { InAppNotificationOpenTaskDetail } from "@/lib/inAppNotifications";

/**
 * Abre o mesmo fluxo do sininho quando o utilizador chega via notificação do Windows (query na URL).
 */
export function useAgendaNotificationDeepLink(params: {
  ready: boolean;
  onOpen: (detail: InAppNotificationOpenTaskDetail) => void;
}): void {
  const { ready, onOpen } = params;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const detail = parseAgendaNotificationDeepLink(window.location.search);
    if (!detail) return;

    onOpenRef.current({
      taskId: detail.taskId,
      opportunityId: detail.opportunityId,
      dueAtIso: detail.dueAtIso,
    });

    const remaining = stripAgendaNotificationDeepLinkParams(window.location.search);
    const nextUrl = `${window.location.pathname}${remaining ? `?${remaining}` : ""}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [ready]);
}