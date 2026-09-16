import { normalizeTaskStatus, CRM_TASK_STATUS } from "@/lib/crm/contract";

/** Visit is overdue when still scheduled and the due date/time has passed. */
export function isTaskOverdue(
  status: string,
  dueAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (normalizeTaskStatus(status) !== CRM_TASK_STATUS.AGENDADO || !dueAt) return false;

  const scheduled = new Date(dueAt);
  if (isNaN(scheduled.getTime())) return false;

  return scheduled.getTime() < now.getTime();
}

export function resolveTaskOverdue(task: {
  status?: string;
  dueDate?: Date;
  dueAt?: string | Date;
  isOverdue?: boolean;
}): boolean {
  if (task.isOverdue) return true;
  const dueAt = task.dueDate ?? task.dueAt;
  return isTaskOverdue(task.status || "", dueAt);
}
