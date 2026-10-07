import { describe, expect, it } from "vitest";
import {
  formatCrmVisitTitleDetail,
  parseCrmVisitTitleSegments,
  buildTechVisitDrawerHeader,
  formatVisitServiceSupplementaryName,
  isVisitDetailRedundantWithAddress,
} from "../techVisitDisplay";

describe("parseCrmVisitTitleSegments", () => {
  it("remove segmentos duplicados", () => {
    expect(
      parseCrmVisitTitleSegments("Visita Técnica - Visita Técnica - Tirar Medidas - Rua do Parque")
    ).toEqual(["Visita Técnica", "Tirar Medidas", "Rua do Parque"]);
  });
});

describe("formatCrmVisitTitleDetail", () => {
  it("omite prefixo Visita Técnica e tipo de serviço repetido", () => {
    expect(
      formatCrmVisitTitleDetail("Visita Técnica - Visita Técnica - Tirar Medidas - Rua do Parque", {
        omitServiceLabels: ["Tirar Medidas"],
      })
    ).toBe("Rua do Parque");
  });
});

describe("buildTechVisitDrawerHeader", () => {
  it("usa o cliente como título principal sem repetir morada", () => {
    const { heading, detail } = buildTechVisitDrawerHeader({
      client: "Maria Silva",
      title: "Visita Técnica - Tirar Medidas - Rua do Parque",
      address: "Rua do Parque, Lisboa",
      omitServiceLabels: ["Tirar Medidas"],
    });
    expect(heading).toBe("Maria Silva");
    expect(detail).toBe("");
  });
});

describe("isVisitDetailRedundantWithAddress", () => {
  it("deteta fragmento da morada", () => {
    expect(
      isVisitDetailRedundantWithAddress(
        "Rua do Parque",
        "Rua do Parque, Caldas da Rainha, 2500-001"
      )
    ).toBe(true);
  });
});

describe("formatVisitServiceSupplementaryName", () => {
  it("não mostra título CRM quando já há chip do serviço e morada", () => {
    expect(
      formatVisitServiceSupplementaryName({
        rawName: "Visita Técnica - Tirar Medidas - Rua do Parque",
        serviceLabel: "Tirar Medidas",
        address: "Rua do Parque, Caldas da Rainha, 2500-001",
      })
    ).toBe("");
  });
});
