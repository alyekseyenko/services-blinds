import { outboxQueue } from "@/lib/outboxQueue";
import { getN8nWebhookSecret } from "@/lib/n8nPost";
import { defineE2ECheck } from "../checkHelpers";

const STALE_PENDING_WARN_MS = 15 * 60 * 1000;

export const outboxQueueCheck = defineE2ECheck({
  id: "outbox-queue-health",
  name: "Transactional Outbox",
  category: "OUTBOX",
  description: "Outbox queue must not have dead-letter failures",
  tier: "safe",
  covers: [],
  remediation:
    "Open failed events in outbox scratch data, fix webhook URL, then Reprocess Outbox.",
  async run() {
    const stats = outboxQueue.getStats();
    const missingWebhookSecret =
      process.env.NODE_ENV === "production" && !getN8nWebhookSecret();

    if (stats.failed > 0) {
      return {
        status: "FAIL",
        message: `${stats.failed} failed event(s), ${stats.pending} pending, ${stats.processed} processed.`,
        details: { ...stats, missingWebhookSecret },
      };
    }

    if (stats.oldestPendingAgeMs > STALE_PENDING_WARN_MS) {
      const minutes = Math.round(stats.oldestPendingAgeMs / 60_000);
      return {
        status: "WARN",
        message: `Evento PENDING há ${minutes} min — verificar n8n e URLs N8N_*.`,
        details: { ...stats, missingWebhookSecret },
      };
    }

    if (missingWebhookSecret) {
      return {
        status: "WARN",
        message:
          "N8N_WEBHOOK_SECRET não definido em produção — webhooks n8n sem autenticação.",
        details: stats,
      };
    }

    if (stats.pending > 0) {
      const prunedNote =
        stats.prunedStale && stats.prunedStale > 0
          ? ` (${stats.prunedStale} stale localhost event(s) auto-pruned)`
          : "";
      return {
        status: "WARN",
        message: `${stats.pending} pending event(s) waiting for delivery${prunedNote}.`,
        details: stats,
      };
    }
    const prunedNote =
      stats.prunedStale && stats.prunedStale > 0
        ? ` (${stats.prunedStale} stale localhost event(s) auto-pruned)`
        : "";
    return {
      status: "PASS",
      message: `Outbox healthy (${stats.processed} processed, 0 pending)${prunedNote}.`,
      details: stats,
    };
  },
});
