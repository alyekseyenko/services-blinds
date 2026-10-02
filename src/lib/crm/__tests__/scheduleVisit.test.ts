import { afterEach, describe, expect, it } from "vitest";
import {
  buildSchedulePlan,
  isClientConfirmationSchedulingEnabled,
} from "../scheduleVisit";
import { CRM_STAGES, CRM_TASK_STATUS } from "../contract";

describe("buildSchedulePlan", () => {
  afterEach(() => {
    delete process.env.SCHEDULING_CLIENT_CONFIRMATION_ENABLED;
  });

  it("por defeito: AGENDADO, sem notificar cliente, avança etapa quando aplicável", () => {
    const plan = buildSchedulePlan({ urgent: false, currentStage: CRM_STAGES.ENTRADA });
    expect(plan.taskStatus).toBe(CRM_TASK_STATUS.AGENDADO);
    expect(plan.notifyClient).toBe(false);
    expect(plan.nextStage).toBe(CRM_STAGES.TIRAR_MEDIDAS);
    expect(isClientConfirmationSchedulingEnabled()).toBe(false);
  });

  it("fluxo urgente: igual ao padrão direto", () => {
    const plan = buildSchedulePlan({ urgent: true, currentStage: CRM_STAGES.ENTRADA });
    expect(plan.taskStatus).toBe(CRM_TASK_STATUS.AGENDADO);
    expect(plan.notifyClient).toBe(false);
    expect(plan.nextStage).toBe(CRM_STAGES.TIRAR_MEDIDAS);
  });

  it("fluxo urgente: mantém etapa quando getNextStageOnSchedule não altera", () => {
    const plan = buildSchedulePlan({ urgent: true, currentStage: CRM_STAGES.MANUTENCAO });
    expect(plan.nextStage).toBeNull();
  });

  it("legado com confirmação: POR_AGENDAR e notificação quando env ativa e não urgente", () => {
    process.env.SCHEDULING_CLIENT_CONFIRMATION_ENABLED = "true";
    const plan = buildSchedulePlan({ urgent: false, currentStage: CRM_STAGES.ENTRADA });
    expect(plan.taskStatus).toBe(CRM_TASK_STATUS.POR_AGENDAR);
    expect(plan.notifyClient).toBe(true);
    expect(plan.nextStage).toBeNull();
  });

  it("legado: urgente ignora confirmação mesmo com env ativa", () => {
    process.env.SCHEDULING_CLIENT_CONFIRMATION_ENABLED = "true";
    const plan = buildSchedulePlan({ urgent: true, currentStage: CRM_STAGES.ENTRADA });
    expect(plan.taskStatus).toBe(CRM_TASK_STATUS.AGENDADO);
    expect(plan.notifyClient).toBe(false);
  });
});
