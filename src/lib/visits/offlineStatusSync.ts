import { CRM_TASK_STATUS, normalizeTaskStatus } from "@/lib/crm/contract";

export type OfflineStatusPayloadTimes = {
  status: string;
  visitArrivedAt?: number;
  occurredAt?: number;
};

function apiStatus(status: string): string {
  return normalizeTaskStatus(status) ?? status.toUpperCase();
}

export function isVisitArrivalStatus(status: string): boolean {
  return apiStatus(status) === CRM_TASK_STATUS.EM_CURSO;
}

export function isVisitClosingStatus(status: string): boolean {
  const normalized = apiStatus(status);
  return (
    normalized === CRM_TASK_STATUS.CONCLUIDO ||
    normalized === CRM_TASK_STATUS.DONE ||
    normalized === CRM_TASK_STATUS.INCOMPLETO ||
    normalized === CRM_TASK_STATUS.CANCELADO
  );
}

/** Preserve arrival timestamp when coalescing offline status updates on the same task. */
export function resolveVisitArrivedAtMs(
  previous: Record<string, unknown> | undefined,
  nextStatus: string,
  nextOccurredAtMs: number
): number | undefined {
  const prevStatus = typeof previous?.status === "string" ? previous.status : "";
  const prevArrived =
    typeof previous?.visitArrivedAt === "number" && Number.isFinite(previous.visitArrivedAt)
      ? previous.visitArrivedAt
      : typeof previous?.occurredAt === "number" && isVisitArrivalStatus(prevStatus)
        ? previous.occurredAt
        : undefined;

  if (isVisitArrivalStatus(nextStatus)) {
    return nextOccurredAtMs;
  }
  if (isVisitClosingStatus(nextStatus) && prevArrived !== undefined) {
    return prevArrived;
  }
  if (isVisitClosingStatus(nextStatus) && isVisitArrivalStatus(prevStatus)) {
    return typeof previous?.occurredAt === "number" ? previous.occurredAt : prevArrived;
  }
  return prevArrived;
}

export function toOccurredAtIso(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
}
