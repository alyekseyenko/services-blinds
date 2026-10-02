import { describe, expect, it } from "vitest";
import { buildSchedulePlan } from "../scheduleVisit";
import {
  CRM_STAGES,
  CRM_TASK_STATUS,
  classifyOpportunityWorkflowOnTaskClose,
} from "../contract";
import { resolveStageAfterTaskStatusChange } from "../pipelineTransitions";

describe("fluxo medição: agendar visita e concluir", () => {
  it("ENTRADA → TIRAR_MEDIDAS ao agendar e Concluído → ORCAMENTAR (título tipo reparação)", () => {
    const plan = buildSchedulePlan({ urgent: false, currentStage: CRM_STAGES.ENTRADA });
    expect(plan.nextStage).toBe(CRM_STAGES.TIRAR_MEDIDAS);

    const stageAfterSchedule = plan.nextStage ?? CRM_STAGES.TIRAR_MEDIDAS;
    const workflow = classifyOpportunityWorkflowOnTaskClose(
      stageAfterSchedule,
      "Reparação — Cliente E2E",
      "Visita Técnica - Tirar medidas — E2E"
    );
    expect(workflow).toBe("measurement");

    const targetStage = resolveStageAfterTaskStatusChange(
      workflow,
      CRM_TASK_STATUS.CONCLUIDO
    );
    expect(targetStage).toBe(CRM_STAGES.ORCAMENTAR);
  });
});
