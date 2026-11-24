import { describe, expect, it } from "vitest";
import {
  buildScheduleFormPrefill,
  getTaskIdForReschedule,
  localAgendaKindsForSchedule,
} from "@/lib/admin/scheduleFormPrefill";
import type { Opportunity, WorkspaceMember } from "@/types/admin";

const member: WorkspaceMember = {
  id: "mem-1",
  name: "João Silva",
  isWorkspaceMember: true,
};

function opp(partial: Partial<Opportunity>): Opportunity {
  return {
    id: "1",
    twentyId: "tw-1",
    title: "Instalação",
    client: "Cliente",
    address: "Rua A",
    coordinates: null,
    stage: "AGENDADO",
    status: "AGENDADO",
    scheduledAt: new Date(2026, 5, 12, 10, 30),
    hasScheduledTask: true,
    taskId: "task-1",
    technicianId: "mem-1",
    technician: "João Silva",
    ...partial,
  } as Opportunity;
}

describe("getTaskIdForReschedule", () => {
  it("reutiliza task em AGENDADO e POR_AGENDAR", () => {
    expect(getTaskIdForReschedule("t1", "AGENDADO")).toBe("t1");
    expect(getTaskIdForReschedule("t1", "POR_AGENDAR")).toBe("t1");
    expect(getTaskIdForReschedule("t1", "EM_CURSO")).toBeUndefined();
  });
});

describe("buildScheduleFormPrefill", () => {
  it("preenche data/hora e técnico em reagendamento", () => {
    const form = buildScheduleFormPrefill(opp({}), [member], "reschedule");
    expect(form.date).toBe("2026-06-12");
    expect(form.time).toBe("10:30");
    expect(form.technicianId).toBe("mem-1");
  });
});

describe("localAgendaKindsForSchedule", () => {
  it("distingue reagendada e reatribuida", () => {
    const base = opp({});
    const newDue = new Date(2026, 5, 12, 14, 0);
    const kinds = localAgendaKindsForSchedule(base, newDue, "mem-2", true);
    expect(kinds).toContain("reagendada");
    expect(kinds).toContain("reatribuida");
  });
});