import { describe, it, expect } from "vitest";
import { isTaskOverdue, resolveTaskOverdue } from "../taskUtils";

describe("taskUtils", () => {
  const now = new Date("2026-09-16T14:00:00");

  it("marks visit overdue when scheduled time passed today", () => {
    expect(isTaskOverdue("Agendado", "2026-09-16T10:00:00", now)).toBe(true);
  });

  it("does not mark future visit today as overdue", () => {
    expect(isTaskOverdue("Agendado", "2026-09-16T16:00:00", now)).toBe(false);
  });

  it("marks visit overdue from previous days", () => {
    expect(isTaskOverdue("Agendado", "2026-09-15T10:00:00", now)).toBe(true);
  });

  it("ignores completed or in-progress visits", () => {
    expect(isTaskOverdue("Concluído", "2026-09-15T10:00:00", now)).toBe(false);
    expect(isTaskOverdue("EM_CURSO", "2026-09-16T10:00:00", now)).toBe(false);
  });

  it("resolveTaskOverdue uses dueDate fallback", () => {
    expect(
      resolveTaskOverdue({
        status: "Agendado",
        dueDate: new Date("2020-01-01T10:00:00"),
      })
    ).toBe(true);
  });
});
