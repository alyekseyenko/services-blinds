import { describe, expect, it } from "vitest";
import { buildSchedulePlan } from "../scheduleVisit";
import { CRM_STAGES, CRM_TASK_STATUS } from "../contract";

describe("buildSchedulePlan", () => {
  it("fluxo normal: POR_AGENDAR, notificar cliente, sem avanço de etapa", () => {
    const plan = buildSchedulePlan({ urgent: false, currentStage: CRM_STAGES.ENTRADA });
    expect(plan.taskStatus).toBe(CRM_TASK_STATUS.POR_AGENDAR);
    expect(plan.notifyClient).toBe(true);
    expect(plan.nextStage).toBeNull();
  });

  it("fluxo urgente: AGENDADO, sem notificação, avança ENTRADA para TIRAR_MEDIDAS", () => {
    const plan = buildSchedulePlan({ urgent: true, currentStage: CRM_STAGES.ENTRADA });
    expect(plan.taskStatus).toBe(CRM_TASK_STATUS.AGENDADO);
    expect(plan.notifyClient).toBe(false);
    expect(plan.nextStage).toBe(CRM_STAGES.TIRAR_MEDIDAS);
  });

  it("fluxo urgente: mantém etapa quando getNextStageOnSchedule não altera", () => {
    const plan = buildSchedulePlan({ urgent: true, currentStage: CRM_STAGES.MANUTENCAO });
    expect(plan.nextStage).toBeNull();
  });
});
