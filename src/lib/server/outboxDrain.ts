import "server-only";

import { outboxQueue } from "@/lib/outboxQueue";
import { logger } from "@/lib/logger";

const DRAIN_INTERVAL_MS = 2 * 60 * 1000;

let started = false;

export function startOutboxDrain(): void {
  if (started || process.env.NEXT_RUNTIME === "edge") return;
  started = true;

  const tick = () => {
    void outboxQueue.processPending().catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.warn("[OutboxDrain] Falha ao reprocessar fila pendente.", { error: error.message });
    });
  };

  setInterval(tick, DRAIN_INTERVAL_MS);
  setTimeout(tick, 15_000);
}
