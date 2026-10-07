import { describe, expect, it } from "vitest";
import {
  isOpportunityPendingTechnicianClosure,
  isVisitPendingTechnicianClosure,
  startOfLocalCalendarDay,
} from "@/lib/visitPendingClosure";
import type { Opportunity } from "@/types/admin";

describe("visitPendingClosure", () => {
  const wed10h = new Date(2026, 3, 8, 10, 0, 0);

  it("ignora visitas de hoje ainda agendadas", () => {
    const now = new Date(2026, 3, 8, 18, 0, 0);
    expect(
      isVisitPendingTechnicianClosure(
        { status: "AGENDADO", dueAt: new Date(2026, 3, 8, 9, 0, 0) },
        now
      )
    ).toBe(false);
  });

  it("marca agendado de dia anterior como por fechar", () => {
    const now = new Date(2026, 3, 8, 8, 0, 0);
    expect(
      isVisitPendingTechnicianClosure(
        { status: "AGENDADO", dueAt: new Date(2026, 3, 7, 15, 0, 0) },
        now
      )
    ).toBe(true);
  });

  it("inclui em curso de dia anterior", () => {
    const now = new Date(2026, 3, 8, 12, 0, 0);
    expect(
      isVisitPendingTechnicianClosure(
        { status: "EM_CURSO", dueAt: new Date(2026, 3, 7, 11, 0, 0) },
        now
      )
    ).toBe(true);
  });

  it("exclui estados terminais", () => {
    const now = new Date(2026, 3, 8, 12, 0, 0);
    expect(
      isVisitPendingTechnicianClosure(
        { status: "INCOMPLETO", dueAt: new Date(2026, 3, 7, 11, 0, 0) },
        now
      )
    ).toBe(false);
  });

  it("oportunidade exige tarefa agendada activa", () => {
    const now = new Date(2026, 3, 8, 12, 0, 0);
    const base: Opportunity = {
      id: "1",
      twentyId: "1",
      title: "T",
      client: "C",
      address: "",
      coordinates: null,
      stage: "ENTRADA",
      status: "AGENDADO",
      scheduledAt: new Date(2026, 3, 7, 10, 0, 0),
      dueDate: null,
      hasScheduledTask: true,
      taskStatus: "AGENDADO",
      taskId: "t1",
    };
    expect(isOpportunityPendingTechnicianClosure(base, now)).toBe(true);
    expect(
      isOpportunityPendingTechnicianClosure({ ...base, hasScheduledTask: false }, now)
    ).toBe(false);
  });

  it("startOfLocalCalendarDay zera horas", () => {
    const d = startOfLocalCalendarDay(wed10h);
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(8);
  });
});
