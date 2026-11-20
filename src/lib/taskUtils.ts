import { normalizeTaskStatus, CRM_TASK_STATUS } from "@/lib/crm/contract";

/** Hora da visita: não usar `dueDate` do mapa admin (é a criação da oportunidade). */
export function resolveVisitDueAt(task: {
  dueAt?: string | Date | null;
  scheduledAt?: string | Date | null;
  dueDate?: string | Date | null;
}): string | Date | null | undefined {
  if (task.dueAt != null && task.dueAt !== "") return task.dueAt;
  if (task.scheduledAt != null && task.scheduledAt !== "") return task.scheduledAt;
  return task.dueDate;
}

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

export function resolveTaskOverdue(
  task: {
    status?: string;
    dueDate?: string | Date | null;
    dueAt?: string | Date | null;
    scheduledAt?: string | Date | null;
    isOverdue?: boolean;
  },
  now: Date = new Date()
): boolean {
  const dueAt = resolveVisitDueAt(task);
  if (dueAt != null && dueAt !== "") {
    return isTaskOverdue(task.status || "", dueAt, now);
  }
  return Boolean(task.isOverdue);
}
