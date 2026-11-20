/** After a failed attempt, newAttemptCount is attempt_count + 1 (1-based). */
export const OUTBOX_MAX_ATTEMPTS = 8;

export function outboxBackoffIntervalMinutes(newAttemptCount: number): number | null {
  if (newAttemptCount >= OUTBOX_MAX_ATTEMPTS) return null;
  if (newAttemptCount <= 1) return 1;
  if (newAttemptCount === 2) return 5;
  if (newAttemptCount === 3) return 15;
  return 60;
}

export function isOutboxDeadLetterAfterFailure(newAttemptCount: number): boolean {
  return newAttemptCount >= OUTBOX_MAX_ATTEMPTS;
}
