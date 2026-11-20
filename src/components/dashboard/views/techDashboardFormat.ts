import {
  isTaskCancelled,
  isTaskCompleted,
  isTaskIncomplete,
} from "@/lib/crm/contract";

export function historyStatusLabel(status: string): string {
  if (isTaskCompleted(status)) return "Concluída";
  if (isTaskCancelled(status)) return "Cancelada";
  if (isTaskIncomplete(status)) return "Incompleta";
  return status;
}

export function formatPtDate(
  hydrated: boolean,
  date: Date,
  options: Intl.DateTimeFormatOptions
): string {
  if (!hydrated) return "\u00a0";
  return date.toLocaleDateString("pt-PT", options);
}