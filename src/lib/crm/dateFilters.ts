/** Intervalo UTC inclusivo para filtrar registos de um ano civil no Twenty CRM. */
export function yearToUtcRange(year: number): { gte: string; lte: string } {
  return {
    gte: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString(),
    lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString(),
  };
}

export function recentYears(count = 8, anchorYear = new Date().getFullYear()): number[] {
  return Array.from({ length: count }, (_, i) => anchorYear - i);
}

export const ADMIN_PIPELINE_FETCH_LIMIT = 250;
export const ADMIN_HISTORY_PAGE_SIZE = 50;

const TERMINAL_HISTORY_STATUSES = new Set([
  "Concluído",
  "CONCLUIDO",
  "Cancelado",
  "CANCELADO",
  "Incompleto",
  "INCOMPLETO",
]);

export function isTerminalHistoryStatus(status: string | null | undefined): boolean {
  return TERMINAL_HISTORY_STATUSES.has(status || "");
}

function historyStamp(item: {
  historyAt?: Date | string | null;
  scheduledAt?: Date | string | null;
  dueDate?: Date | string | null;
}): number {
  const raw = item.historyAt || item.scheduledAt || item.dueDate || 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** Newest visit first. historyAt is the scheduled visit, not the day the CRM record was created. */
export function sortOpportunitiesByRecentDate<
  T extends {
    historyAt?: Date | string | null;
    scheduledAt?: Date | string | null;
    dueDate?: Date | string | null;
  },
>(items: T[]): T[] {
  return [...items].sort((a, b) => historyStamp(b) - historyStamp(a));
}
