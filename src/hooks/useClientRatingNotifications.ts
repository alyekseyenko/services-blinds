"use client";

import { useEffect, useRef } from "react";
import {
  diffClientRatings,
  formatClientRatingNotice,
  type ClientRatingNotice,
} from "@/lib/agenda/clientRatingDiff";
import { showDesktopAgendaNotification } from "@/lib/agenda/desktopNotifications";
import { pushOrMergeAgendaInAppNotification } from "@/lib/inAppNotifications";
import type { useToast } from "@/components/ui/ToastContext";

const STORAGE_PREFIX = "fieldops_client_ratings_v1_";
const POLL_MS = 60_000;

function loadSeen(scope: string): ClientRatingNotice[] | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${scope}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientRatingNotice[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveSeen(scope: string, items: ClientRatingNotice[]): void {
  localStorage.setItem(`${STORAGE_PREFIX}${scope}`, JSON.stringify(items));
}

export function useClientRatingNotifications(options: {
  scope: string;
  ready: boolean;
  toast: ReturnType<typeof useToast>;
}): void {
  const { scope, ready, toast } = options;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!scope || !ready || typeof window === "undefined") return;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/agenda/ratings", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { ratings?: ClientRatingNotice[] };
        const next = Array.isArray(body.ratings) ? body.ratings : [];
        const previous = loadSeen(scope);
        const fresh = diffClientRatings(previous, next);
        saveSeen(scope, next);
        for (const item of fresh) {
          const copy = formatClientRatingNotice(item);
          toastRef.current.info(copy.title, copy.description);
          const now = Date.now();
          const stars = item.rating === 1 ? "1 estrela" : `${item.rating} estrelas`;
          const detail = [stars, item.feedback?.trim()].filter(Boolean).join(" · ");
          const list = pushOrMergeAgendaInAppNotification(scope, {
            title: copy.title,
            description: copy.description,
            taskId: item.taskId,
            dueAtIso: item.dueAt,
            opportunityId: item.opportunityId,
            notificationKind: "agenda",
            agendaKind: "avaliacao_cliente",
            visit: {
              clientName: item.clientName,
              serviceNumber: item.serviceNumber,
              nsi: item.nsi,
              technicianName: item.technicianName,
              dueAtIso: item.dueAt,
            },
            agendaTimeline: [{ kind: "avaliacao_cliente", at: now, detail: detail || undefined }],
          });
          const saved = list[0];
          if (saved) void showDesktopAgendaNotification(scope, saved);
        }
      } catch {
        /* o próximo ciclo volta a tentar */
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [scope, ready]);
}
