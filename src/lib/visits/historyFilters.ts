import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import { isTaskCancelled, isTaskCompleted, isTaskIncomplete } from "@/lib/crm/contract";
import { isUnassignedTechnicianName } from "@/lib/map/legendTechnicians";
import { canonicalTechnicianName } from "@/lib/technicianIdentity";

export const HISTORY_TIME_ZONE = "Europe/Lisbon";

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type HistoryDatePreset = "all" | "today" | "7d" | "30d" | "from" | "between";

export type HistoryDateRange = {
  from?: string | null;
  to?: string | null;
};

export const HISTORY_DATE_PRESET_OPTIONS: { value: HistoryDatePreset; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "from", label: "Desde" },
  { value: "between", label: "Entre" },
];

export const HISTORY_OUTCOME_OPTIONS: { value: MapHistoryOutcome; label: string }[] = [
  { value: "completed", label: "Concluído" },
  { value: "incomplete", label: "Incompleto" },
  { value: "cancelled", label: "Cancelado" },
];

export function isValidHistoryYmd(value: string | null | undefined): boolean {
  if (!value) return false;
  const match = YMD_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  );
}

export function parseHistoryYmd(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return isValidHistoryYmd(trimmed) ? trimmed : null;
}

export function toLisbonYmd(value: Date | string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HISTORY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

export function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const parsed = parseHistoryYmd(ymd);
  if (!parsed) return ymd;
  const match = YMD_RE.exec(parsed);
  if (!match) return ymd;
  const utc = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + deltaDays)
  );
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function historyVisitDay(
  item: {
    historyAt?: Date | string | null;
    scheduledAt?: Date | string | null;
    dueDate?: Date | string | null;
    updatedAt?: Date | string | null;
  }
): string | null {
  return (
    toLisbonYmd(item.historyAt) ||
    toLisbonYmd(item.scheduledAt) ||
    toLisbonYmd(item.dueDate) ||
    toLisbonYmd(item.updatedAt)
  );
}

export function resolveHistoryDateRange(
  preset: HistoryDatePreset,
  from: string | null | undefined,
  to: string | null | undefined,
  now: Date = new Date()
): HistoryDateRange {
  const today = toLisbonYmd(now);
  if (!today) return {};

  if (preset === "today") return { from: today, to: today };
  if (preset === "7d") return { from: addCalendarDaysYmd(today, -6), to: today };
  if (preset === "30d") return { from: addCalendarDaysYmd(today, -29), to: today };
  if (preset === "from") {
    const start = parseHistoryYmd(from);
    return start ? { from: start } : {};
  }
  if (preset === "between") {
    const start = parseHistoryYmd(from);
    const end = parseHistoryYmd(to);
    if (start && end && start > end) return { from: end, to: start };
    if (start && end) return { from: start, to: end };
    if (start) return { from: start };
    if (end) return { to: end };
    return {};
  }
  return {};
}

export function matchesHistoryDateRange(
  dayOrStamp: Date | string | number | null | undefined,
  range: HistoryDateRange
): boolean {
  const from = parseHistoryYmd(range.from);
  const to = parseHistoryYmd(range.to);
  if (!from && !to) return true;
  const day =
    typeof dayOrStamp === "string" && isValidHistoryYmd(dayOrStamp)
      ? dayOrStamp
      : toLisbonYmd(dayOrStamp);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function matchesHistoryVisitDate(
  item: {
    historyAt?: Date | string | null;
    scheduledAt?: Date | string | null;
    dueDate?: Date | string | null;
    updatedAt?: Date | string | null;
  },
  range: HistoryDateRange
): boolean {
  const day = historyVisitDay(item);
  return matchesHistoryDateRange(day, range);
}

export function matchesTaskHistoryOutcomes(
  status: string | null | undefined,
  outcomes: readonly MapHistoryOutcome[]
): boolean {
  if (outcomes.length === 0) return true;
  const kind = isTaskCompleted(status)
    ? "completed"
    : isTaskIncomplete(status)
      ? "incomplete"
      : isTaskCancelled(status)
        ? "cancelled"
        : null;
  return kind !== null && outcomes.includes(kind);
}

export function historyFilterQuery(params: {
  page?: number;
  pageSize?: number;
  from?: string | null;
  to?: string | null;
  outcomes?: readonly MapHistoryOutcome[];
  q?: string | null;
  technician?: string | null;
}): string {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set("page", String(params.page));
  else if (params.page === 1) search.set("page", "1");
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.outcomes && params.outcomes.length > 0) {
    search.set("outcomes", [...params.outcomes].join(","));
  }
  const q = params.q?.trim();
  if (q) search.set("q", q);
  const tech = params.technician?.trim();
  if (tech && tech !== "all") search.set("technician", tech);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** Nomes no filtro do Histórico: técnicos da equipa + visitas listadas. */
export function historyTechnicianFilterOptions(
  fromApi: readonly string[] | null | undefined,
  items: ReadonlyArray<{ technician?: string | null }>,
  knownTechnicians: readonly (string | null | undefined)[] = []
): string[] {
  const names = new Set<string>();
  for (const name of knownTechnicians) {
    const canonical = canonicalTechnicianName(name);
    if (canonical && !isUnassignedTechnicianName(canonical)) names.add(canonical);
  }
  for (const name of fromApi ?? []) {
    const canonical = canonicalTechnicianName(name);
    if (canonical) names.add(canonical);
  }
  for (const item of items) {
    const canonical = canonicalTechnicianName(item.technician);
    if (canonical) names.add(canonical);
  }
  return [...names].sort((a, b) => {
    const aUnassigned = isUnassignedTechnicianName(a);
    const bUnassigned = isUnassignedTechnicianName(b);
    if (aUnassigned !== bUnassigned) return aUnassigned ? 1 : -1;
    return a.localeCompare(b, "pt-PT");
  });
}
