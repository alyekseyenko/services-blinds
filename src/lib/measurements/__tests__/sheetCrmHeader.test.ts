import { describe, expect, it } from "vitest";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import {
  applySheetCrmHeader,
  isBlankSheetHeader,
  sheetNeedsCrmEnrichment,
} from "@/lib/measurements/sheetCrmHeader";

const baseSheet: MeasurementSheet = {
  opportunityId: "opp-1",
  clientName: "Cliente",
  address: "Rua A",
  groups: [],
};

describe("isBlankSheetHeader", () => {
  it("trata vazio e N/A como em falta", () => {
    expect(isBlankSheetHeader(undefined)).toBe(true);
    expect(isBlankSheetHeader("")).toBe(true);
    expect(isBlankSheetHeader("  ")).toBe(true);
    expect(isBlankSheetHeader("N/A")).toBe(true);
    expect(isBlankSheetHeader("n/a")).toBe(true);
    expect(isBlankSheetHeader("3627")).toBe(false);
  });
});

describe("sheetNeedsCrmEnrichment", () => {
  it("pede CRM quando falta NSI ou n.º de serviço", () => {
    expect(
      sheetNeedsCrmEnrichment({
        ...baseSheet,
        serviceNumber: "12",
        nsi: "N/A",
        clientNif: "1",
        clientPhone: "2",
        clientEmail: "a@b.pt",
      })
    ).toBe(true);
    expect(
      sheetNeedsCrmEnrichment({
        ...baseSheet,
        serviceNumber: "",
        nsi: "3627",
        clientNif: "1",
        clientPhone: "2",
        clientEmail: "a@b.pt",
      })
    ).toBe(true);
  });

  it("não pede CRM quando o cabeçalho já está completo", () => {
    expect(
      sheetNeedsCrmEnrichment({
        ...baseSheet,
        serviceNumber: "88",
        nsi: "3627",
        clientNif: "1",
        clientPhone: "2",
        clientEmail: "a@b.pt",
      })
    ).toBe(false);
  });
});

describe("applySheetCrmHeader", () => {
  it("preenche NSI e n.º de serviço a partir do CRM sem apagar valores já gravados", () => {
    const filled = applySheetCrmHeader(
      { ...baseSheet, nsi: "N/A", serviceNumber: undefined },
      { nsi: "3627", serviceNumber: "104" }
    );
    expect(filled.nsi).toBe("3627");
    expect(filled.serviceNumber).toBe("104");

    const kept = applySheetCrmHeader(
      { ...baseSheet, nsi: "111", serviceNumber: "9" },
      { nsi: "3627", serviceNumber: "104" }
    );
    expect(kept.nsi).toBe("111");
    expect(kept.serviceNumber).toBe("9");
  });
});
