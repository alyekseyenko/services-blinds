/** Default admin/technician calendar block when no CRM end time is set. */
export const CALENDAR_DEFAULT_VISIT_MS = 60 * 60 * 1000;

export const SCHEDULE_DAY_PRESETS = {
  manha: { start: "08:00", end: "13:00", label: "Manhã" },
  tarde: { start: "13:00", end: "18:00", label: "Tarde" },
  dia: { start: "08:00", end: "18:00", label: "Dia" },
} as const;

export type ScheduleDayPresetKey = keyof typeof SCHEDULE_DAY_PRESETS;

export function isScheduleEndAfterStart(start: Date, end: Date): boolean {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  if (end.getTime() <= start.getTime()) return false;
  return (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  );
}

export function resolveCalendarEventEnd(
  start: Date | null | undefined,
  scheduledEndAt?: Date | string | null
): Date | undefined {
  if (!start || Number.isNaN(start.getTime())) return undefined;
  if (scheduledEndAt != null && scheduledEndAt !== "") {
    const end = scheduledEndAt instanceof Date ? scheduledEndAt : new Date(scheduledEndAt);
    if (!Number.isNaN(end.getTime()) && isScheduleEndAfterStart(start, end)) {
      return end;
    }
  }
  return new Date(start.getTime() + CALENDAR_DEFAULT_VISIT_MS);
}

/** Half-open intervals [start, end): back-to-back visits (11:00 / 11:00) do not overlap. */
export function schedulingIntervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  if (
    [startA, endA, startB, endB].some((d) => Number.isNaN(d.getTime())) ||
    endA.getTime() <= startA.getTime() ||
    endB.getTime() <= startB.getTime()
  ) {
    return false;
  }
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

export function formatScheduleTimeInput(value: Date | string | null | undefined): string {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}