import "server-only";

import { isMeasurementsDbConfigured } from "@/lib/measurements/db/client";
import { runMeasurementsMigrations } from "@/lib/measurements/db/migrate";
import { processMeasurementsOutboxBatch } from "@/lib/measurements/processOutbox";
import { logger } from "@/lib/logger";

const DRAIN_INTERVAL_MS = 30 * 1000;

let started = false;
let drainRunning = false;
let lastTickAt: number | null = null;

export function getMeasurementsOutboxDrainHeartbeat(): { lastTickAt: number | null } {
  return { lastTickAt };
}

export function startMeasurementsOutboxDrain(): void {
  if (started || process.env.NEXT_RUNTIME === "edge") return;
  if (!isMeasurementsDbConfigured()) return;
  started = true;

  void runMeasurementsMigrations().catch((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("[MeasurementsDB] Falha nas migrações.", { error: error.message });
  });

  const tick = () => {
    if (drainRunning) return;
    drainRunning = true;
    void processMeasurementsOutboxBatch()
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.warn("[MeasurementsOutbox] Falha ao processar fila.", { error: error.message });
      })
      .finally(() => {
        lastTickAt = Date.now();
        drainRunning = false;
      });
  };

  setInterval(tick, DRAIN_INTERVAL_MS);
  setTimeout(tick, 20_000);
}
