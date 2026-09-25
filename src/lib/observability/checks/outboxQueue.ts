import { outboxQueue } from "@/lib/outboxQueue";
import { defineE2ECheck } from "../checkHelpers";

export const outboxQueueCheck = defineE2ECheck({
  id: "outbox-queue-health",
  name: "Transactional Outbox",
  category: "OUTBOX",
  description: "Outbox queue must not have dead-letter failures",
  tier: "safe",
  remediation:
    "Open failed events in outbox scratch data, fix webhook URL, then Reprocess Outbox.",
  async run() {
    const stats = outboxQueue.getStats();
    if (stats.failed > 0) {
      return {
        status: "FAIL",
        message: `${stats.failed} failed event(s), ${stats.pending} pending, ${stats.processed} processed.`,
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
