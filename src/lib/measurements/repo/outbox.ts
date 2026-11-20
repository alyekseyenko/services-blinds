import "server-only";
import { isMeasurementsDbConfigured, measurementsQuery } from "../db/client";
import { OUTBOX_MAX_ATTEMPTS } from "@/lib/measurements/outboxBackoff";
export type PendingOutboxRow = {
  id: string;
  sheet_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  client_request_id: string | null;
  attempt_count?: number;
};

export async function fetchPendingOutboxEvents(limit = 20): Promise<PendingOutboxRow[]> {
  if (!isMeasurementsDbConfigured()) return [];
  return measurementsQuery<PendingOutboxRow>(
    `SELECT id, sheet_id, event_type, payload, client_request_id, attempt_count
     FROM measurements_outbox
     WHERE processed_at IS NULL
       AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
}

export async function markOutboxProcessed(id: string): Promise<void> {
  await measurementsQuery(
    `UPDATE measurements_outbox SET processed_at = NOW(), last_error = NULL, attempt_count = 0, next_attempt_at = NULL WHERE id = $1`,
    [id]
  );
}

export async function markOutboxFailed(id: string, error: string): Promise<void> {
  const truncated = error.slice(0, 2000);
  await measurementsQuery(
    `UPDATE measurements_outbox SET
        attempt_count = attempt_count + 1,
        last_error = $2,
        processed_at = CASE WHEN attempt_count + 1 >= ${OUTBOX_MAX_ATTEMPTS} THEN NOW() ELSE NULL END,
        next_attempt_at = CASE
          WHEN attempt_count + 1 >= ${OUTBOX_MAX_ATTEMPTS} THEN NULL
          ELSE NOW() + (
            CASE (attempt_count + 1)
              WHEN 1 THEN INTERVAL '1 minute'
              WHEN 2 THEN INTERVAL '5 minutes'
              WHEN 3 THEN INTERVAL '15 minutes'
              ELSE INTERVAL '1 hour'
            END
          )
        END
      WHERE id = $1`,
    [id, truncated]
  );
}