"use client";

import { useEffect, useRef } from "react";
import { pushInAppNotification } from "@/lib/inAppNotifications";
import { shouldNotifyObservabilityReport } from "@/lib/observabilityNotifyDedupe";
import type { ObservabilityStatusPayload } from "@/lib/observability/e2eTypes";

const POLL_MS = 5 * 60 * 1000;

export function useObservabilityAdminAlerts(
  enabled: boolean,
  notificationScope: string
): void {
  const lastSeenId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !notificationScope) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/observability/status", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as ObservabilityStatusPayload;
        const last = data.lastRun;
        if (!last || cancelled) return;

        if (lastSeenId.current === last.id) return;
        lastSeenId.current = last.id;

        const hasFailure =
          last.overallStatus === "CRITICAL" || last.score.failed > 0;
        const hasRegression = last.regressions.length > 0;
        if (!hasFailure && !hasRegression) return;

        if (!shouldNotifyObservabilityReport(notificationScope, last.id)) return;

        const failCount = last.score.failed;
        const title = hasRegression
          ? "Observabilidade: regressão detetada"
          : `Observabilidade: ${failCount} verificação(ões) a falhar`;

        pushInAppNotification(notificationScope, {
          title,
          description: "Abra a consola SRE para ver detalhes e remediação.",
          notificationKind: "observability",
          href: "/admin/observabilidade",
        });
      } catch {
        /* ignore transient errors */
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled, notificationScope]);
}
