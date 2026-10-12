import { isTaskActive } from "@/lib/crm/contract";
import type { Opportunity } from "@/types/admin";

/** Local calendar day start (field ops use device/admin browser locale). */
export function startOfLocalCalendarDay(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDueAt(dueAt: string | Date | null | undefined): Date | null {
  if (!dueAt) return null;
  const d = dueAt instanceof Date ? dueAt : new Date(dueAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Visit still active in CRM but scheduled before today — technician has not closed it.
 * Distinct from {@link isTaskOverdue}: same-day overdue stays on the day agenda until midnight.
 */
export function isVisitPendingTechnicianClosure(
  input: { status?: string | null; dueAt?: string | Date | null },
  now: Date = new Date()
): boolean {
  if (!isTaskActive(input.status)) return false;
  const due = parseDueAt(input.dueAt);
  if (!due) return false;
  const startToday = startOfLocalCalendarDay(now);
  return due.getTime() < startToday.getTime();
}

export function isOpportunityPendingTechnicianClosure(
  opp: Pick<
    Opportunity,
    "hasScheduledTask" | "taskStatus" | "status" | "scheduledAt" | "dueDate"
  >,
  now: Date = new Date()
): boolean {
  if (!opp.hasScheduledTask) return false;
  const status = opp.taskStatus ?? opp.status;
  const dueAt = opp.scheduledAt ?? opp.dueDate;
  return isVisitPendingTechnicianClosure({ status, dueAt }, now);
}

export function countOpportunitiesPendingTechnicianClosure(
  opportunities: Opportunity[],
  now: Date = new Date()
): number {
  let n = 0;
  for (const opp of opportunities) {
    if (isOpportunityPendingTechnicianClosure(opp, now)) n += 1;
  }
  return n;
}

/** Due instant strictly before today's local midnight (for bell copy, not active-task filter). */
export function isVisitDueBeforeToday(
  dueAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  const due = parseDueAt(dueAt);
  if (!due) return false;
  return due.getTime() < startOfLocalCalendarDay(now).getTime();
}

export const PENDING_CLOSURE_BELL_NOTE_PT =
  "Dia anterior — estava por fechar no terreno.";

export function sortByScheduledAtAsc(
  a: { scheduledAt?: string | Date | null; dueDate?: Date | null },
  b: { scheduledAt?: string | Date | null; dueDate?: Date | null }
): number {
  const ta = parseDueAt(a.scheduledAt ?? a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const tb = parseDueAt(b.scheduledAt ?? b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return ta - tb;
}
