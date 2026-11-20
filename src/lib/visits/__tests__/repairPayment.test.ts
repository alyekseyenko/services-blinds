import { describe, expect, it } from "vitest";
import {
  extraRepairPaymentNoteBody,
  extraServiceNeedsPaymentNow,
  missingRepairPayments,
  opportunityRequiresRepairPayment,
  repairPaymentNoteBody,
  repairsNeedingPayment,
} from "@/lib/visits/repairPayment";

describe("repairPayment", () => {
  const repair = {
    opportunityId: "11111111-1111-4111-8111-111111111111",
    serviceType: "REPARACAO",
    mode: "now",
  };
  const later = {
    opportunityId: "22222222-2222-4222-8222-222222222222",
    serviceType: "REPARACAO",
    mode: "later",
  };
  const install = {
    opportunityId: "33333333-3333-4333-8333-333333333333",
    serviceType: "INSTALACAO",
    mode: "now",
  };

  it("pede pagamento só na reparação feita nesta visita", () => {
    expect(repairsNeedingPayment([repair, later, install])).toEqual([repair]);
  });

  it("não pede pagamento se o CRM já passou a manutenção (nome antigo pode dizer Reparação)", () => {
    const reclassified = {
      opportunityId: "55555555-5555-4555-8555-555555555555",
      serviceType: "MANUTENCAO",
      stage: "MANUTENCAO",
      name: "Reparação — Cliente Teste",
      mode: "now" as const,
    };
    expect(repairsNeedingPayment([reclassified])).toEqual([]);
    expect(opportunityRequiresRepairPayment(reclassified)).toBe(false);
    expect(missingRepairPayments([reclassified], {})).toEqual([]);
  });

  it("bloqueia a conclusão enquanto faltar o pagamento", () => {
    expect(missingRepairPayments([repair], {})).toEqual([repair]);
    expect(missingRepairPayments([repair], { [repair.opportunityId]: "tpa_local" })).toEqual([]);
  });

  it("bloqueia Outros sem motivo e aceita com motivo", () => {
    const id = repair.opportunityId;
    expect(missingRepairPayments([repair], { [id]: "outros" })).toEqual([repair]);
    expect(missingRepairPayments([repair], { [id]: "outros" }, { [id]: "  " })).toEqual([repair]);
    expect(missingRepairPayments([repair], { [id]: "outros" }, { [id]: "Era manutenção" })).toEqual([]);
  });

  it("escreve a nota de pagamento em português", () => {
    expect(repairPaymentNoteBody({ method: "numerario_sede" })).toBe("Pagamento: Numerário na sede");
    expect(
      repairPaymentNoteBody({ method: "outros", detail: "Cliente enganou-se no tipo de serviço" })
    ).toBe("Pagamento: Outros — Cliente enganou-se no tipo de serviço");
  });

  it("não pede pagamento outra vez se o extra já ficou pago no local", () => {
    expect(
      repairsNeedingPayment([
        { ...repair, paymentMethod: "tpa_local" },
        { ...repair, opportunityId: "44444444-4444-4444-8444-444444444444" },
      ])
    ).toEqual([{ ...repair, opportunityId: "44444444-4444-4444-8444-444444444444" }]);
  });

  it("trata Outros pago no local como concluído", () => {
    expect(
      repairsNeedingPayment([
        {
          ...repair,
          paymentMethod: "outros",
          paymentDetail: "Sem cobrança",
        },
      ])
    ).toEqual([]);
  });

  it("distingue o pagamento do extra feito agora", () => {
    expect(extraRepairPaymentNoteBody("tpa_local")).toBe(
      "Pagamento do serviço extra (feito no local): TPA no local."
    );
    expect(extraRepairPaymentNoteBody("outros", "Não era reparação paga")).toBe(
      "Pagamento do serviço extra (feito no local): Outros — Não era reparação paga."
    );
    expect(extraServiceNeedsPaymentNow("REPARACAO", "now")).toBe(true);
    expect(extraServiceNeedsPaymentNow("REPARACAO", "later")).toBe(false);
    expect(extraServiceNeedsPaymentNow("MANUTENCAO", "now")).toBe(false);
  });
});