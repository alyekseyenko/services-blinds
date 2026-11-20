import { describe, expect, it } from "vitest";
import {
  isScheduleEndAfterStart,
  resolveCalendarEventEnd,
  schedulingIntervalsOverlap,
} from "@/lib/visits/calendarVisitSpan";

describe("calendarVisitSpan", () => {
  it("defaults to one hour without scheduled end", () => {
    const start = new Date(2026, 0, 15, 9, 0);
    const end = resolveCalendarEventEnd(start, null);
    expect(end?.getTime()).toBe(start.getTime() + 60 * 60 * 1000);
  });

  it("uses CRM end when after start on same day", () => {
    const start = new Date(2026, 0, 15, 8, 0);
    const scheduledEnd = new Date(2026, 0, 15, 13, 0);
    expect(resolveCalendarEventEnd(start, scheduledEnd)?.getTime()).toBe(scheduledEnd.getTime());
  });

  it("overlap ignores back-to-back slots", () => {
    const a0 = new Date(2026, 0, 15, 8, 0);
    const a1 = new Date(2026, 0, 15, 9, 0);
    const b0 = new Date(2026, 0, 15, 9, 0);
    const b1 = new Date(2026, 0, 15, 10, 0);
    expect(schedulingIntervalsOverlap(a0, a1, b0, b1)).toBe(false);
    expect(schedulingIntervalsOverlap(a0, a1, new Date(2026, 0, 15, 8, 30), b1)).toBe(true);
  });

  it("rejects end on another day", () => {
    const start = new Date(2026, 0, 15, 8, 0);
    const scheduledEnd = new Date(2026, 0, 16, 8, 0);
    expect(isScheduleEndAfterStart(start, scheduledEnd)).toBe(false);
    expect(resolveCalendarEventEnd(start, scheduledEnd)?.getTime()).toBe(
      start.getTime() + 60 * 60 * 1000
    );
  });
});