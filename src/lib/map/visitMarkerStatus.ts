import {
  isNeedsSchedulingStage,
  isTaskCancelled,
  isTaskCompleted,
  isTaskIncomplete,
} from "@/lib/crm/contract";
import type { MarkerStatusBadge } from "@/lib/map/serviceMarkerArt";

export function visitStatusFromTask(task: {
  status?: string | null;
  taskStatus?: string | null;
}): string | null {
  return task.taskStatus || task.status || null;
}

/** Emblema no canto do pino: fecho da visita ganha a atraso / por agendar. */
export function resolveVisitMarkerStatus(task: {
  status?: string | null;
  taskStatus?: string | null;
  stage?: string | null;
  hasScheduledTask?: boolean;
  isLate?: boolean;
}): MarkerStatusBadge {
  const status = visitStatusFromTask(task);
  if (isTaskCancelled(status)) return "cancelled";
  if (isTaskIncomplete(status)) return "incomplete";
  if (isTaskCompleted(status)) return "done";
  if (task.isLate) return "late";
  if (isNeedsSchedulingStage(task.stage) && !task.hasScheduledTask) return "unscheduled";
  return null;
}
