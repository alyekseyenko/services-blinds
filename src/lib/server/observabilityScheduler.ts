import "server-only";

import { logger } from "@/lib/logger";

const BOOT_DELAY_MS = 60_000;
const INTERVAL_MS = 15 * 60 * 1000;

let started = false;
let running = false;

async function runScheduledSafeSuite(trigger: "deploy" | "scheduled"): Promise<void> {
  if (running) {
    logger.info("[ObservabilityScheduler] Execução ignorada — suite já em curso.");
    return;
  }
  running = true;
  try {
    const { runAndPersistObservabilitySuite } = await import(
      "@/lib/server/observabilityHistory"
    );
    const deploymentId = process.env.NEXT_DEPLOYMENT_ID?.trim() || undefined;
    await runAndPersistObservabilitySuite("safe", {
      trigger,
      deploymentId,
    });
    logger.info(`[ObservabilityScheduler] Suite safe concluída (${trigger}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("[ObservabilityScheduler] Falha na suite automática.", { error: message });
  } finally {
    running = false;
  }
}

export function startObservabilityScheduler(): void {
  if (started || process.env.NEXT_RUNTIME === "edge") return;
  started = true;

  setTimeout(() => {
    void runScheduledSafeSuite("deploy");
  }, BOOT_DELAY_MS);

  setInterval(() => {
    void runScheduledSafeSuite("scheduled");
  }, INTERVAL_MS);
}

/** Expõe estado para testes unitários. */
export function isObservabilitySchedulerRunning(): boolean {
  return running;
}
