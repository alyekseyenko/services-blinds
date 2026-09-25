const MIN_INTERVAL_MS = 15 * 60 * 1000;
let lastRunAt = 0;
let inFlight = false;

export type MaintenanceThrottleResult<T> =
  | { skipped: true; reason: "interval" | "in_progress" }
  | { skipped: false; data: T };

export async function runMaintenanceThrottled<T>(
  fn: () => Promise<T>
): Promise<MaintenanceThrottleResult<T>> {
  const now = Date.now();
  if (inFlight) {
    return { skipped: true, reason: "in_progress" };
  }
  if (now - lastRunAt < MIN_INTERVAL_MS) {
    return { skipped: true, reason: "interval" };
  }

  inFlight = true;
  lastRunAt = now;
  try {
    const data = await fn();
    return { skipped: false, data };
  } finally {
    inFlight = false;
  }
}
