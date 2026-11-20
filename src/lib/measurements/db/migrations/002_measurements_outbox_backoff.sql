-- Backoff for failed outbox rows so permanent failures do not block the queue.

ALTER TABLE measurements_outbox
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE measurements_outbox
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;
