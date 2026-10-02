/** Janela de datas para a agenda do técnico (evita cortar visitas atuais com `first: N`). */
export const TECHNICIAN_TASK_PAGE_SIZE = 100;
export const TECHNICIAN_TASK_WINDOW_DAYS_PAST = 60;
export const TECHNICIAN_TASK_WINDOW_DAYS_FUTURE = 60;

export function technicianTaskDueDateWindow(): { dueFrom: string; dueTo: string } {
  const now = new Date();
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - TECHNICIAN_TASK_WINDOW_DAYS_PAST);
  from.setUTCHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() + TECHNICIAN_TASK_WINDOW_DAYS_FUTURE);
  to.setUTCHours(23, 59, 59, 999);

  return { dueFrom: from.toISOString(), dueTo: to.toISOString() };
}
