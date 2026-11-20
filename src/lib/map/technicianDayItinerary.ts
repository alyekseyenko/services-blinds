import {
  isTaskCancelled,
  isTaskCompleted,
  isTaskIncomplete,
} from "@/lib/crm/contract";
import { resolveTaskOverdue } from "@/lib/taskUtils";
import { toLisbonYmd } from "@/lib/visits/historyFilters";

export type TechnicianDayItineraryItem = {
  id?: string;
  twentyId?: string;
  technician?: string | null;
  technicianId?: string | null;
  coordinates?: [number, number] | null;
  scheduledAt?: string | Date | null;
  start?: string | Date | null;
  historyAt?: string | Date | null;
  dueDate?: string | Date | null;
  status?: string | null;
  taskStatus?: string | null;
  isOverdue?: boolean;
  /** ISO — «Cheguei ao local». Sem isto, um cancelamento não entra no trajeto. */
  visitArrivedAt?: string | Date | null;
};

function visitKey(item: TechnicianDayItineraryItem): string {
  return String(item.twentyId || item.id || "");
}

export function visitWhenForItinerary(item: TechnicianDayItineraryItem): Date | null {
  const raw = item.scheduledAt || item.start || item.historyAt;
  if (raw == null || raw === "") return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isVisitOnLisbonDay(
  item: TechnicianDayItineraryItem,
  dayYmd: string
): boolean {
  const when = visitWhenForItinerary(item);
  if (!when) return false;
  return toLisbonYmd(when) === dayYmd;
}

function matchesTechnician(
  item: TechnicianDayItineraryItem,
  technicianId?: string | null,
  technicianName?: string | null
): boolean {
  if (technicianId && item.technicianId && item.technicianId === technicianId) return true;
  const norm = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const want = norm(technicianName);
  const have = norm(item.technician);
  if (!want || !have) return false;
  return have === want || have.includes(want) || want.includes(have);
}

export function mergeTechnicianDayPool<T extends TechnicianDayItineraryItem>(
  live: T[],
  history: T[]
): T[] {
  const byKey = new Map<string, T>();
  for (const item of [...live, ...history]) {
    const key = visitKey(item);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, item);
      continue;
    }
    const prevTerminal = isTaskCompleted(prev.taskStatus || prev.status) ||
      isTaskIncomplete(prev.taskStatus || prev.status) ||
      isTaskCancelled(prev.taskStatus || prev.status);
    const nextTerminal = isTaskCompleted(item.taskStatus || item.status) ||
      isTaskIncomplete(item.taskStatus || item.status) ||
      isTaskCancelled(item.taskStatus || item.status);
    const chosen = !prevTerminal && nextTerminal ? item : prev;
    const other = chosen === item ? prev : item;
    byKey.set(key, {
      ...chosen,
      visitArrivedAt: chosen.visitArrivedAt ?? other.visitArrivedAt ?? null,
    });
  }
  return Array.from(byKey.values());
}

export function technicianDayItinerary<T extends TechnicianDayItineraryItem>(
  pool: T[],
  options: {
    technicianId?: string | null;
    technicianName?: string | null;
    dayYmd: string;
  }
): T[] {
  return pool
    .filter((item) => {
      if (!item.coordinates || !Array.isArray(item.coordinates)) return false;
      if (!matchesTechnician(item, options.technicianId, options.technicianName)) return false;
      return isVisitOnLisbonDay(item, options.dayYmd);
    })
    .sort((a, b) => {
      const ta = visitWhenForItinerary(a)?.getTime() ?? 0;
      const tb = visitWhenForItinerary(b)?.getTime() ?? 0;
      return ta - tb;
    });
}

export type ItineraryStopKind = "done" | "incomplete" | "cancelled" | "late" | "pending";

export function itineraryStopKind(stop: TechnicianDayItineraryItem): ItineraryStopKind {
  const status = stop.status || stop.taskStatus;
  if (isTaskCompleted(status)) return "done";
  if (isTaskIncomplete(status)) return "incomplete";
  if (isTaskCancelled(status)) return "cancelled";
  if (
    resolveTaskOverdue({
      status: status ?? undefined,
      dueAt: stop.scheduledAt ?? stop.historyAt ?? undefined,
      isOverdue: stop.isOverdue,
    })
  ) {
    return "late";
  }
  return "pending";
}

export function itineraryStopStillOpen(kind: ItineraryStopKind): boolean {
  return kind === "pending" || kind === "late";
}

export function visitHadOnSiteArrival(stop: TechnicianDayItineraryItem): boolean {
  const raw = stop.visitArrivedAt;
  if (raw == null || raw === "") return false;
  if (typeof raw === "string") return raw.trim().length > 0;
  return !Number.isNaN(new Date(raw).getTime());
}

/** Linha de condução: visitas ainda por fazer, ou qualquer paragem com «Cheguei ao local» (incompleta, cancelada, concluída). */
export function itineraryStopOnDrivingRoute(stop: TechnicianDayItineraryItem): boolean {
  if (visitHadOnSiteArrival(stop)) return true;
  const kind = itineraryStopKind(stop);
  if (itineraryStopStillOpen(kind)) return true;
  // Incompleta implica que o técnico esteve no local, mesmo sem marcador antigo.
  return kind === "incomplete";
}

export function firstOpenStopIndex(stops: TechnicianDayItineraryItem[]): number {
  return stops.findIndex((stop) => itineraryStopStillOpen(itineraryStopKind(stop)));
}