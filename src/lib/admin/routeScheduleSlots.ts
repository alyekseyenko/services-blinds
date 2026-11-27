import { isScheduleEndAfterStart } from "@/lib/visits/calendarVisitSpan";

export type {
  ConflictCheckOpportunity,
  ScheduleConflict,
  ScheduleConflictOptions,
  ScheduleConflictSeverity,
} from "@/lib/admin/scheduleConflictEngine";
export {
  findScheduleConflicts,
  formatScheduleConflictPt,
  aggregateScheduleConflictWarning,
} from "@/lib/admin/scheduleConflictEngine";

const SLOT_DURATION_MIN = 105;
const DAY_START_HOUR = 8;
const DAY_START_MINUTE = 30;
const LUNCH_START_HOUR = 13;
const LUNCH_END_HOUR = 14;

export interface RouteSlot {
  stopIndex: number;
  dueAt: Date;
  hourLabel: string;
}

/** Same default as the single-visit form. Mass schedule starts here until someone edits or distributes. */
export const MASS_SCHEDULE_DEFAULT_TIME = "09:00";

export function formatRouteClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function dueAtFromScheduleDateAndTime(dateIso: string, time: string): Date | null {
  if (!dateIso || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [year, month, day] = dateIso.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (![year, month, day, hour, minute].every((n) => Number.isFinite(n))) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return new Date(year, month - 1, day, hour, minute);
}

export function massStopTime(stopTimes: Record<string, string>, stopId: string): string {
  const raw = stopTimes[stopId]?.trim();
  return raw && /^\d{2}:\d{2}$/.test(raw) ? raw : MASS_SCHEDULE_DEFAULT_TIME;
}

export function massStopDueAt(
  dateIso: string,
  stopTimes: Record<string, string>,
  stopId: string
): Date | null {
  return dueAtFromScheduleDateAndTime(dateIso, massStopTime(stopTimes, stopId));
}

export function massStopEndTime(stopEndTimes: Record<string, string>, stopId: string): string {
  return stopEndTimes[stopId]?.trim() ?? "";
}

export function massStopEndAt(
  dateIso: string,
  startDueAt: Date | null,
  stopEndTimes: Record<string, string>,
  stopId: string
): Date | null {
  const endTime = massStopEndTime(stopEndTimes, stopId);
  if (!endTime || !/^\d{2}:\d{2}$/.test(endTime) || !startDueAt) return null;
  const end = dueAtFromScheduleDateAndTime(dateIso, endTime);
  if (!end || !isScheduleEndAfterStart(startDueAt, end)) return null;
  return end;
}

export function resolveHoraDeFimIsoFromStopTimes(
  dateIso: string,
  startTime: string,
  endTime: string | undefined
): string | null {
  const trimmed = endTime?.trim();
  if (!trimmed) return null;
  const start = dueAtFromScheduleDateAndTime(dateIso, startTime);
  const end = dueAtFromScheduleDateAndTime(dateIso, trimmed);
  if (!start || !end || !isScheduleEndAfterStart(start, end)) return null;
  return end.toISOString();
}

/** Fills each stop from the existing 08:30 / 105 min ladder. Only when the operator asks. */
export function autoDistributedStopTimes(dateIso: string, stopIds: string[]): Record<string, string> {
  const slots = computeRouteSlots(dateIso, stopIds.length);
  const times: Record<string, string> = {};
  stopIds.forEach((id, index) => {
    const slot = slots[index];
    if (slot) times[id] = formatRouteClock(slot.dueAt);
  });
  return times;
}

export function duplicateMassStopTimeMessage(
  stops: Array<{ title: string; time: string }>
): string | null {
  const firstByTime = new Map<string, string>();
  for (const stop of stops) {
    const previous = firstByTime.get(stop.time);
    if (previous) {
      return `«${stop.title}» e «${previous}» estão à mesma hora (${stop.time}). Ajuste as horas ou use Repartir horas.`;
    }
    firstByTime.set(stop.time, stop.title);
  }
  return null;
}

export function computeRouteSlots(dateIso: string, stopCount: number): RouteSlot[] {
  if (!dateIso || stopCount <= 0) return [];

  const [year, month, day] = dateIso.split("-").map(Number);
  let currentHour = DAY_START_HOUR;
  let currentMinute = DAY_START_MINUTE;
  const slots: RouteSlot[] = [];

  for (let i = 0; i < stopCount; i++) {
    if (currentHour >= LUNCH_START_HOUR && currentHour < LUNCH_END_HOUR) {
      currentHour = LUNCH_END_HOUR;
      currentMinute = 0;
    }

    const dueAt = new Date(year, month - 1, day, currentHour, currentMinute);
    slots.push({
      stopIndex: i,
      dueAt,
      hourLabel: dueAt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
    });

    currentMinute += SLOT_DURATION_MIN;
    while (currentMinute >= 60) {
      currentMinute -= 60;
      currentHour += 1;
    }
  }

  return slots;
}
