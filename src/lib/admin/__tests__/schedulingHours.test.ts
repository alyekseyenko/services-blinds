import { describe, expect, it } from "vitest";
import {
  getAdminSchedulingHoursError,
  isAdminScheduleTimeStringValid,
  isWithinAdminSchedulingHours,
  validateRouteSlotsBusinessHours,
} from "../schedulingHours";

describe("schedulingHours", () => {
  it("aceita horas entre 8h00 e antes das 18h00", () => {
    expect(isWithinAdminSchedulingHours(new Date(2026, 0, 1, 8, 0))).toBe(true);
    expect(isWithinAdminSchedulingHours(new Date(2026, 0, 1, 17, 59))).toBe(true);
    expect(isAdminScheduleTimeStringValid("09:30")).toBe(true);
  });

  it("rejeita antes das 8h e a partir das 18h", () => {
    expect(isWithinAdminSchedulingHours(new Date(2026, 0, 1, 7, 59))).toBe(false);
    expect(isWithinAdminSchedulingHours(new Date(2026, 0, 1, 18, 0))).toBe(false);
    expect(isAdminScheduleTimeStringValid("18:00")).toBe(false);
    expect(isAdminScheduleTimeStringValid("07:30")).toBe(false);
  });

  it("valida slots de rota", () => {
    expect(
      validateRouteSlotsBusinessHours([{ dueAt: new Date(2026, 0, 1, 10, 0) }])
    ).toBeNull();
    expect(
      validateRouteSlotsBusinessHours([{ dueAt: new Date(2026, 0, 1, 19, 0) }])
    ).toContain("8h00");
  });

  it("mensagem de erro em pt-PT", () => {
    expect(getAdminSchedulingHoursError(new Date(2026, 0, 1, 20, 0))).toMatch(
      /8h00 – 18h00/
    );
  });
});
