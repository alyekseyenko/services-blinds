import { describe, expect, it } from "vitest";
import { fairDurationForOpportunity } from "@/lib/admin/fairDurationDisplay";
import type { FairServiceTypeDuration } from "@/lib/schemas/ceoMetrics";

const fair: FairServiceTypeDuration[] = [
  {
    serviceType: "REPARACAO",
    serviceLabel: "Reparação",
    sampleCount: 12,
    recommendedDurationMs: 80 * 60_000,
    recommendedMinutes: 80,
    formattedRecommended: "1 h 20 min",
  },
];

describe("fairDurationForOpportunity", () => {
  it("cruza o tipo do serviço com a lista de tempos justos", () => {
    const row = fairDurationForOpportunity(fair, {
      serviceType: "REPARACAO",
      title: "Visita — Cliente",
      stage: "REPARACAO",
    });
    expect(row?.formattedRecommended).toBe("1 h 20 min");
  });

  it("devolve undefined quando o tipo não tem histórico suficiente", () => {
    const row = fairDurationForOpportunity(fair, {
      serviceType: "INSTALACAO",
      title: "Instalação",
      stage: "INSTALACAO",
    });
    expect(row).toBeUndefined();
  });
});
