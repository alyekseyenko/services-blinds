import { beforeEach, describe, expect, it, vi } from "vitest";
import { CRM_STAGES, CRM_TASK_STATUS } from "../contract";
import {
  assertAllowedTransition,
  applyOpportunityStageTransition,
  getVisitServiceStage,
  PIPELINE_STAGE_CONFLICT_MESSAGE,
  resolveStageAfterSchedule,
  resolveStageAfterTaskStatusChange,
  shouldSkipPipelineTransitionForTaskStatus,
} from "../pipelineTransitions";

vi.mock("../opportunities", () => ({
  fetchOpportunityStageFromCrm: vi.fn(),
  writeOpportunityStageToCrm: vi.fn(),
}));

import {
  fetchOpportunityStageFromCrm,
  writeOpportunityStageToCrm,
} from "../opportunities";

describe("pipelineTransitions", () => {
  beforeEach(() => {
    vi.mocked(fetchOpportunityStageFromCrm).mockReset();
    vi.mocked(writeOpportunityStageToCrm).mockReset();
  });

  it("ADR 001: EM_CURSO does not drive pipeline transitions", () => {
    expect(shouldSkipPipelineTransitionForTaskStatus(CRM_TASK_STATUS.EM_CURSO)).toBe(
      true
    );
    expect(shouldSkipPipelineTransitionForTaskStatus(CRM_TASK_STATUS.AGENDADO)).toBe(
      false
    );
  });

  it("resolveStageAfterSchedule matches contract rules", () => {
    expect(resolveStageAfterSchedule(CRM_STAGES.ENTRADA)).toBe(
      CRM_STAGES.TIRAR_MEDIDAS
    );
    expect(resolveStageAfterSchedule(CRM_STAGES.MARCAR_INSTALACAO)).toBe(
      CRM_STAGES.INSTALACAO
    );
  });

  it("resolveStageAfterTaskStatusChange on measurement complete", () => {
    expect(
      resolveStageAfterTaskStatusChange("measurement", CRM_TASK_STATUS.CONCLUIDO)
    ).toBe(CRM_STAGES.ORCAMENTAR);
  });

  it("getVisitServiceStage maps extra service types", () => {
    expect(getVisitServiceStage("REPARACAO")).toBe(CRM_STAGES.REPARACAO);
    expect(getVisitServiceStage("TIRAR_MEDIDAS")).toBe(CRM_STAGES.TIRAR_MEDIDAS);
  });

  describe("assertAllowedTransition", () => {
    it("allows schedule from ENTRADA to TIRAR_MEDIDAS", () => {
      expect(
        assertAllowedTransition(CRM_STAGES.ENTRADA, CRM_STAGES.TIRAR_MEDIDAS, "schedule_visit")
      ).toBe(true);
    });

    it("rejects schedule jump that does not match getNextStageOnSchedule", () => {
      expect(
        assertAllowedTransition(CRM_STAGES.ENTRADA, CRM_STAGES.ORCAMENTAR, "schedule_visit")
      ).toBe(false);
    });

    it("allows warehouse prep complete", () => {
      expect(
        assertAllowedTransition(
          CRM_STAGES.PREPARACAO,
          CRM_STAGES.MARCAR_INSTALACAO,
          "warehouse_prep_complete"
        )
      ).toBe(true);
    });

    it("allows measurement visit complete to ORCAMENTAR", () => {
      expect(
        assertAllowedTransition(
          CRM_STAGES.TIRAR_MEDIDAS,
          CRM_STAGES.ORCAMENTAR,
          "task_completed"
        )
      ).toBe(true);
    });
  });

  describe("conclusão de visita em oportunidades de assistência", () => {
    it("REPARACAO concluída sem título de medição avança para PAGAMENTO_TOTAL", async () => {
      vi.mocked(fetchOpportunityStageFromCrm).mockResolvedValue(CRM_STAGES.REPARACAO);

      const result = await applyOpportunityStageTransition(
        "opp-extra",
        CRM_STAGES.PAGAMENTO_TOTAL,
        "task_completed",
        {
          currentStage: CRM_STAGES.REPARACAO,
          taskStatus: CRM_TASK_STATUS.CONCLUIDO,
          opportunityName: "Reparação — Cliente",
          taskTitle: undefined,
        }
      );

      expect(result.status).toBe("applied");
      expect(writeOpportunityStageToCrm).toHaveBeenCalledWith(
        "opp-extra",
        CRM_STAGES.PAGAMENTO_TOTAL
      );
    });

    it("REPARACAO com visita «Tirar medidas» avança para ORCAMENTAR (sem conflito)", async () => {
      vi.mocked(fetchOpportunityStageFromCrm).mockResolvedValue(CRM_STAGES.REPARACAO);

      const result = await applyOpportunityStageTransition(
        "opp-1",
        CRM_STAGES.ORCAMENTAR,
        "task_completed",
        {
          currentStage: CRM_STAGES.REPARACAO,
          taskStatus: CRM_TASK_STATUS.CONCLUIDO,
          opportunityName: "Reparação — Cliente",
          taskTitle: "Visita Técnica - Tirar medidas — Cliente",
        }
      );

      expect(result.status).toBe("applied");
    });

    it("medição com «instalação» no nome avança para ORCAMENTAR", async () => {
      vi.mocked(fetchOpportunityStageFromCrm).mockResolvedValue(CRM_STAGES.TIRAR_MEDIDAS);

      const result = await applyOpportunityStageTransition(
        "opp-2",
        CRM_STAGES.ORCAMENTAR,
        "task_completed",
        {
          currentStage: CRM_STAGES.TIRAR_MEDIDAS,
          taskStatus: CRM_TASK_STATUS.CONCLUIDO,
          opportunityName: "Instalação estores — Cliente",
          taskTitle: "Visita Técnica - Estores sala",
        }
      );

      expect(result.status).toBe("applied");
    });
  });

  describe("applyOpportunityStageTransition", () => {
    it("returns unchanged when CRM stage already matches target", async () => {
      vi.mocked(fetchOpportunityStageFromCrm).mockResolvedValue(CRM_STAGES.ORCAMENTAR);

      const result = await applyOpportunityStageTransition(
        "opp-1",
        CRM_STAGES.ORCAMENTAR,
        "task_completed",
        { taskStatus: CRM_TASK_STATUS.CONCLUIDO, taskTitle: "Tirar medidas" }
      );

      expect(result.status).toBe("unchanged");
      expect(writeOpportunityStageToCrm).not.toHaveBeenCalled();
    });

    it("conflicts when admin schedule UI stage is stale vs CRM", async () => {
      vi.mocked(fetchOpportunityStageFromCrm).mockResolvedValue(CRM_STAGES.ORCAMENTAR);

      const result = await applyOpportunityStageTransition(
        "opp-1",
        CRM_STAGES.TIRAR_MEDIDAS,
        "schedule_visit",
        { currentStage: CRM_STAGES.ENTRADA }
      );

      expect(result.status).toBe("conflict");
      expect(result.currentStage).toBe(CRM_STAGES.ORCAMENTAR);
      expect(writeOpportunityStageToCrm).not.toHaveBeenCalled();
    });

    it("applies schedule when UI stage matches CRM", async () => {
      vi.mocked(fetchOpportunityStageFromCrm).mockResolvedValue(CRM_STAGES.ENTRADA);

      const result = await applyOpportunityStageTransition(
        "opp-1",
        CRM_STAGES.TIRAR_MEDIDAS,
        "schedule_visit",
        { currentStage: CRM_STAGES.ENTRADA }
      );

      expect(result.status).toBe("applied");
      expect(writeOpportunityStageToCrm).toHaveBeenCalledWith(
        "opp-1",
        CRM_STAGES.TIRAR_MEDIDAS
      );
    });

    it("conflicts on technician complete when CRM moved past measurement funnel", async () => {
      vi.mocked(fetchOpportunityStageFromCrm).mockResolvedValue(CRM_STAGES.PROPOSTA);

      const result = await applyOpportunityStageTransition(
        "opp-1",
        CRM_STAGES.ORCAMENTAR,
        "task_completed",
        {
          currentStage: CRM_STAGES.ENTRADA,
          taskStatus: CRM_TASK_STATUS.CONCLUIDO,
          taskTitle: "Tirar medidas",
        }
      );

      expect(result.status).toBe("conflict");
      expect(writeOpportunityStageToCrm).not.toHaveBeenCalled();
    });

    it("exposes admin conflict message constant in pt-PT", () => {
      expect(PIPELINE_STAGE_CONFLICT_MESSAGE).toContain("Atualize a página");
    });
  });
});
