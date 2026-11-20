/** Visit day first. updatedAt jumps when someone edits the CRM record. */
export function technicianHistorySortTime(task: {
  dueDate?: Date | string | null;
  updatedAt?: Date | string | null;
}): number {
  const visit = task.dueDate ? new Date(task.dueDate).getTime() : Number.NaN;
  if (!Number.isNaN(visit)) return visit;
  const touched = task.updatedAt ? new Date(task.updatedAt).getTime() : Number.NaN;
  return Number.isNaN(touched) ? 0 : touched;
}
