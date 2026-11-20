import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/crm/opportunities", () => ({
  fetchAdminOpportunities: vi.fn(),
}));

import { fetchAdminOpportunities } from "@/lib/crm/opportunities";
import { searchPipelineServicesForMeasurements } from "@/lib/measurements/adminPipelineSearch";

describe("searchPipelineServicesForMeasurements", () => {
  beforeEach(() => {
    vi.mocked(fetchAdminOpportunities).mockResolvedValue([
      {
        twentyId: "opp-1",
        title: "Tirar medidas Loja",
        client: "Cliente A",
        nsi: "123",
        address: "Lisboa",
        stage: "TIRAR_MEDIDAS",
        taskId: "task-1",
      } as Awaited<ReturnType<typeof fetchAdminOpportunities>>[number],
      {
        twentyId: "opp-2",
        title: "Instalação",
        client: "Cliente B",
        nsi: "999",
        address: "Porto",
        stage: "INSTALACAO",
        taskId: "",
      } as Awaited<ReturnType<typeof fetchAdminOpportunities>>[number],
    ]);
  });

  it("filtra por termos no título ou cliente", async () => {
    const hits = await searchPipelineServicesForMeasurements("loja", 20);
    expect(hits).toHaveLength(1);
    expect(hits[0].opportunityId).toBe("opp-1");
  });

  it("expõe taskId em falta como null", async () => {
    const hits = await searchPipelineServicesForMeasurements("instalação", 20);
    expect(hits[0].taskId).toBeNull();
  });
});