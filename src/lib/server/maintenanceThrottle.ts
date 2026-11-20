const MIN_FULL_INTERVAL_MS = 15 * 60 * 1000;
const MIN_MISSING_INTERVAL_MS = 90 * 1000;
const lastRunAt: Record<"full" | "missing", number> = { full: 0, missing: 0 };
let inFlight: "full" | "missing" | null = null;

export type MaintenanceThrottleResult<T> =
  | { skipped: true; reason: "interval" | "in_progress" }
  | { skipped: false; data: T };

export async function runMaintenanceThrottled<T>(
  fn: () => Promise<T>,
  lane: "full" | "missing" = "full"
): Promise<MaintenanceThrottleResult<T>> {
  const minInterval = lane === "missing" ? MIN_MISSING_INTERVAL_MS : MIN_FULL_INTERVAL_MS;
  const now = Date.now();
  if (inFlight) {
    return { skipped: true, reason: "in_progress" };
  }
  if (now - lastRunAt[lane] < minInterval) {
    return { skipped: true, reason: "interval" };
  }

  inFlight = lane;
  lastRunAt[lane] = now;
  try {
    const data = await fn();
    return { skipped: false, data };
  } finally {
    inFlight = null;
  }
}
