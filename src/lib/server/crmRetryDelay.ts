/** Linear backoff with jitter to avoid thundering herds on CRM retries. */
export function crmRetryDelayMs(baseMs: number, attempt: number): number {
  const jitter = Math.floor(Math.random() * 250);
  return baseMs * attempt + jitter;
}

export function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, 120_000);
  }
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    return Math.max(0, Math.min(date - Date.now(), 120_000));
  }
  return null;
}
