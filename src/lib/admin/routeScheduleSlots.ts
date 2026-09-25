export interface ConflictCheckOpportunity {
  title: string;
  twentyId?: string;
  scheduledAt?: string | Date | null;
  status?: string;
  technician?: string;
}

export interface ScheduleConflictOptions {
  /** Opportunities being (re)scheduled in this batch — ignore their existing slots. */
  excludeOpportunityIds?: string[];
}

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
      hourLabel: dueAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    });

    currentMinute += SLOT_DURATION_MIN;
    while (currentMinute >= 60) {
      currentMinute -= 60;
      currentHour += 1;
    }
  }

  return slots;
}

export interface ScheduleConflict {
  stopTitle: string;
  stopTime: Date;
  conflictingTitle: string;
  conflictingTime: Date;
}

export function findScheduleConflicts(
  slots: Array<{ title: string; dueAt: Date; opportunityId?: string }>,
  opportunities: ConflictCheckOpportunity[],
  technicianName: string,
  options: ScheduleConflictOptions = {}
): ScheduleConflict[] {
  if (!technicianName) return [];

  const excludedIds = new Set(options.excludeOpportunityIds || []);
  const conflicts: ScheduleConflict[] = [];

  for (const slot of slots) {
    const slotTime = slot.dueAt.getTime();
    if (slot.opportunityId) {
      excludedIds.add(slot.opportunityId);
    }

    for (const opp of opportunities) {
      if (!opp.scheduledAt || opp.status === "Cancelado" || opp.status === "Concluído") continue;
      if (opp.technician !== technicianName) continue;
      if (opp.twentyId && excludedIds.has(opp.twentyId)) continue;
      if (slot.opportunityId && opp.twentyId === slot.opportunityId) continue;

      const oppTime = new Date(opp.scheduledAt).getTime();
      const diffHours = Math.abs(slotTime - oppTime) / (1000 * 60 * 60);
      if (diffHours < 2) {
        conflicts.push({
          stopTitle: slot.title,
          stopTime: slot.dueAt,
          conflictingTitle: opp.title,
          conflictingTime: new Date(opp.scheduledAt),
        });
      }
    }
  }

  return conflicts;
}
