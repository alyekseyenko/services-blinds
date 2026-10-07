import { isTaskOverdue } from "@/lib/taskUtils";
import type { Opportunity } from "@/types/admin";

/** Mesma regra que `filterMapOpportunities` para delayAlert. */
export function opportunityDelayAlert(opp: Opportunity, now = new Date()): "red" | "orange" | null {
  const createdDate = opp.dueDate || now;
  const diffDays = Math.ceil(
    Math.abs(now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays > 30) return "red";
  if (diffDays > 14) return "orange";
  return null;
}

function parseDue(opp: Opportunity): Date | null {
  const raw = opp.scheduledAt ?? opp.dueDate;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Agendado com hora já passada e data de hoje (não inclui dia anterior). */
export function isOverdueScheduledToday(opp: Opportunity, now = new Date()): boolean {
  if (!opp.hasScheduledTask) return false;
  const due = parseDue(opp);
  if (!due) return false;
  if (due.toDateString() !== now.toDateString()) return false;
  const status = opp.taskStatus ?? opp.status;
  return isTaskOverdue(status, due, now);
}

export type HomeAttentionCounts = {
  overdueToday: number;
  idle14Plus: number;
  idle30Plus: number;
};

export function countHomeAttentionSignals(
  opportunities: Opportunity[],
  now = new Date()
): HomeAttentionCounts {
  let overdueToday = 0;
  let idle14Plus = 0;
  let idle30Plus = 0;

  for (const opp of opportunities) {
    if (isOverdueScheduledToday(opp, now)) overdueToday += 1;
    const alert = opportunityDelayAlert(opp, now);
    if (alert === "orange" || alert === "red") idle14Plus += 1;
    if (alert === "red") idle30Plus += 1;
  }

  return { overdueToday, idle14Plus, idle30Plus };
}
