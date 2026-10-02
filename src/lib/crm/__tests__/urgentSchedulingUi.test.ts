import { describe, expect, it } from "vitest";
import {
  isUrgentSchedulingNote,
  isUrgentVisitMarkdown,
} from "../urgentSchedulingUi";

describe("urgentSchedulingUi", () => {
  it("identifica nota de agendamento urgente pelo título", () => {
    expect(
      isUrgentSchedulingNote({
        title: "Agendamento urgente",
        body: "Agendado diretamente por Admin.",
      })
    ).toBe(true);
  });

  it("identifica nota urgente pelo texto do corpo", () => {
    expect(
      isUrgentSchedulingNote({
        title: "CRM",
        body:
          "Agendado diretamente por Pedro Admin, sem confirmação do cliente nem automações.",
      })
    ).toBe(true);
  });

  it("identifica visita urgente no corpo da task", () => {
    expect(
      isUrgentVisitMarkdown("URGENTE — agendado diretamente, sem confirmação do cliente.")
    ).toBe(true);
  });
});
