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

export function sortOpportunitiesByRecentDate<T extends { scheduledAt?: Date | string | null; dueDate?: Date | string | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.scheduledAt || a.dueDate || 0).getTime();
    const dateB = new Date(b.scheduledAt || b.dueDate || 0).getTime();
    return dateB - dateA;
  });
}
