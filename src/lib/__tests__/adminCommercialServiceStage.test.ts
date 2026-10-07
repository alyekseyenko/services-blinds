import { describe, expect, it } from "vitest";
import { CRM_STAGES } from "@/lib/crm/contract";
import { getAdminCommercialServiceInitialStage } from "@/lib/crm/pipelineTransitions";

describe("getAdminCommercialServiceInitialStage", () => {
  it("maps commercial service types to matching Twenty pipeline stages", () => {
    expect(getAdminCommercialServiceInitialStage("TIRAR_MEDIDAS")).toBe(
      CRM_STAGES.TIRAR_MEDIDAS
    );
    expect(getAdminCommercialServiceInitialStage("REMEDICAO")).toBe(CRM_STAGES.REMEDICAO);
    expect(getAdminCommercialServiceInitialStage("MANUTENCAO")).toBe(CRM_STAGES.MANUTENCAO);
    expect(getAdminCommercialServiceInitialStage("REPARACAO")).toBe(CRM_STAGES.REPARACAO);
    expect(getAdminCommercialServiceInitialStage("INSTALACAO")).toBe(CRM_STAGES.MARCAR_INSTALACAO);
  });
});
