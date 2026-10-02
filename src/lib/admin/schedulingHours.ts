/** Admin field scheduling window (local time, Europe/Lisbon server/client). */
export const ADMIN_SCHEDULE_START_HOUR = 8;
export const ADMIN_SCHEDULE_END_HOUR = 18;

export const ADMIN_SCHEDULE_TIME_INPUT_MIN = "08:00";
export const ADMIN_SCHEDULE_TIME_INPUT_MAX = "17:59";

export const ADMIN_SCHEDULE_HOURS_LABEL = "8h00 – 18h00";

export function isWithinAdminSchedulingHours(date: Date): boolean {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const start = ADMIN_SCHEDULE_START_HOUR * 60;
  const end = ADMIN_SCHEDULE_END_HOUR * 60;
  return totalMinutes >= start && totalMinutes < end;
}

export function isAdminScheduleTimeStringValid(time: string): boolean {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return false;
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function getAdminSchedulingHoursWarning(date: Date): string | null {
  if (isWithinAdminSchedulingHours(date)) return null;
  return `Está fora do horário habitual de agendamento (${ADMIN_SCHEDULE_HOURS_LABEL}).`;
}

/** @deprecated Prefer getAdminSchedulingHoursWarning — no longer blocks scheduling. */
export function getAdminSchedulingHoursError(date: Date): string | null {
  return getAdminSchedulingHoursWarning(date);
}

export function validateRouteSlotsBusinessHours(
  slots: Array<{ dueAt: Date }>
): string | null {
  for (const slot of slots) {
    const warning = getAdminSchedulingHoursWarning(slot.dueAt);
    if (warning) {
      const label = slot.dueAt.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${warning} A paragem às ${label} fica fora desse horário.`;
    }
  }
  return null;
}
