const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

function pruneBuckets(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key);
  }
}

export function isLoginRateLimited(email: string): boolean {
  const key = email.trim().toLowerCase();
  if (!key) return false;
  const now = Date.now();
  pruneBuckets(now);
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    return false;
  }
  return bucket.count >= MAX_ATTEMPTS;
}

export function recordFailedLoginAttempt(email: string): void {
  const key = email.trim().toLowerCase();
  if (!key) return;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
}

export function clearLoginAttempts(email: string): void {
  buckets.delete(email.trim().toLowerCase());
}
