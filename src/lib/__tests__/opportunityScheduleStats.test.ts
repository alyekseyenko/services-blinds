import { describe, expect, it } from "vitest";
import {
  countSchedulingNotes,
  countScheduleEventsFromTimeline,
  isSchedulingCrmNoteTitle,
} from "@/lib/opportunityScheduleStats";

describe("opportunityScheduleStats", () => {
  it("reconhece títulos de nota de agendamento", () => {
    expect(isSchedulingCrmNoteTitle("Instruções de agendamento")).toBe(true);
    expect(isSchedulingCrmNoteTitle("Agendamento urgente")).toBe(true);
    expect(isSchedulingCrmNoteTitle("Observação técnica")).toBe(false);
  });

  it("conta notas CRM de agendamento", () => {
    const stats = countSchedulingNotes([
      { title: "Instruções de agendamento" },
      { title: "Outra" },
      { title: "Agendamento urgente" },
    ]);
    expect(stats.schedulingNotes).toBe(2);
  });

  it("conta nova e reagendada na timeline", () => {
    const stats = countScheduleEventsFromTimeline([
      { kind: "nova" },
      { kind: "reagendada" },
      { kind: "cancelada" },
    ]);
    expect(stats.scheduleEvents).toBe(2);
    expect(stats.reschedules).toBe(1);
  });
});
