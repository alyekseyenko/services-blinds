import "server-only";

import { outboxQueue } from "@/lib/outboxQueue";
import { logger } from "@/lib/logger";

const DRAIN_INTERVAL_MS = 30 * 1000;

let started = false;
let drainRunning = false;
let lastTickAt: number | null = null;

export function getOutboxDrainHeartbeat(): { lastTickAt: number | null } {
  return { lastTickAt };
}

export function startOutboxDrain(): void {
  if (started || process.env.NEXT_RUNTIME === "edge") return;
  started = true;

  const tick = () => {
    if (drainRunning) return;
    drainRunning = true;
    void outboxQueue
      .processPending()
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.warn("[OutboxDrain] Falha ao reprocessar fila pendente.", { error: error.message });
      })
      .finally(() => {
        lastTickAt = Date.now();
        drainRunning = false;
      });
  };

  setInterval(tick, DRAIN_INTERVAL_MS);
  setTimeout(tick, 15_000);
}
