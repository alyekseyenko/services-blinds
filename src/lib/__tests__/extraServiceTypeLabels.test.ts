import { describe, expect, it } from "vitest";
import { buildOnSiteExtraOpportunityName } from "@/lib/extraServiceTypeLabels";

describe("buildOnSiteExtraOpportunityName", () => {
  it("diz que é extra no local e se foi feito ou fica para agendar", () => {
    expect(buildOnSiteExtraOpportunityName("REPARACAO", "Teste Elsa", "now")).toBe(
      "Serviço extra no local (Reparação, feito agora) — Teste Elsa"
    );
    expect(buildOnSiteExtraOpportunityName("REPARACAO", "Teste Elsa", "later")).toBe(
      "Serviço extra no local (Reparação, a agendar) — Teste Elsa"
    );
  });
});