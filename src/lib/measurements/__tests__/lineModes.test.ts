import { describe, expect, it } from "vitest";
import { buildMeasurementSheetFromPayload } from "@/lib/measurements/sheetBuilder";
import { measurementLineColumnPlan } from "@/lib/measurements/sheetDisplay";
import { lineDimensionMode } from "@/lib/measurements/lineModes";
import { formatMosquitoOpeningDisplay } from "@/lib/measurements/extendedFields";

describe("lineDimensionMode", () => {
  it("completo pede só o vão", () => {
    expect(
      lineDimensionMode("ESTORE_EXTERIOR", { exteriorInstallType: "COMPLETO" })
    ).toBe("opening");
  });

  it("esteiras com preciso do vão pede o vão", () => {
    expect(
      lineDimensionMode("ESTORE_EXTERIOR", {
        exteriorInstallType: "PARCIAL",
        partialPartCodes: "ESTEIRAS",
        esteiraMeasureTarget: "VAO",
      })
    ).toBe("opening");
  });

  it("esteiras com preciso da esteira pede a medida do estore", () => {
    expect(
      lineDimensionMode("ESTORE_EXTERIOR", {
        exteriorInstallType: "PARCIAL",
        partialPartCodes: "ESTEIRAS",
        esteiraMeasureTarget: "ESTEIRA",
      })
    ).toBe("store");
  });

  it("skylight no modelo e no rolo", () => {
    expect(lineDimensionMode("ESTORE_INTERIOR", { model: "SKYLIGHT" })).toBe("skylight");
    expect(
      lineDimensionMode("ESTORE_INTERIOR", { model: "ROLO", roloVariant: "SKYLIGHT_ROLO" })
    ).toBe("skylight");
  });
});

describe("ficha com os campos novos", () => {
  it("põe o nome no título, a retificação na ficha e o canal na linha", () => {
    const sheet = buildMeasurementSheetFromPayload(
      { opportunityId: "o", clientName: "C", address: "A" },
      {
        groups: [
          {
            type: "ESTORE_EXTERIOR",
            details: {
              customName: "Varanda",
              exteriorInstallType: "COMPLETO",
              material: "PVC",
              activation: "MOTOR_RTS",
              remeasureNeeded: "OUTROS",
              remeasureNote: "Cliente muda a caixa",
            },
            measurements: [
              {
                qty: 1,
                width: 0,
                height: 0,
                openingWidth: "1250",
                openingHeight: "1550",
                storeChannel: "3",
                storeChannelOther: "sala e quarto",
              },
            ],
          },
        ],
      }
    );

    expect(sheet.groups[0].productLabel).toBe("Estore Exterior — Varanda");
    expect(sheet.remeasureLabel).toBe("Outros: Cliente muda a caixa");
    expect(sheet.groups[0].dimensionMode).toBe("opening");
    expect(sheet.groups[0].rows[0].channelLabel).toContain("3");
    expect(sheet.groups[0].rows[0].channelLabel).toContain("sala e quarto");
    const headers = measurementLineColumnPlan(sheet.groups[0]).columns.map((c) => c.header);
    const altura = headers.findIndex((h) => h.includes("Altura vão"));
    const largura = headers.findIndex((h) => h.includes("Largura vão"));
    expect(altura).toBeGreaterThanOrEqual(0);
    expect(altura).toBeLessThan(largura);
    expect(headers).toContain("Canal");
    expect(headers.some((h) => h.includes("estore"))).toBe(false);
  });

  it("skylight leva interior, exterior e profundidade", () => {
    const sheet = buildMeasurementSheetFromPayload(
      { opportunityId: "o", clientName: "C", address: "A" },
      {
        groups: [
          {
            type: "ESTORE_INTERIOR",
            details: { model: "SKYLIGHT", activation: "MANUAL" },
            measurements: [
              {
                qty: 1,
                width: 800,
                height: 900,
                skylightExteriorWidth: "860",
                skylightExteriorHeight: "960",
                depth: "70",
              },
            ],
          },
        ],
      }
    );
    const row = sheet.groups[0].rows[0];
    expect(row.heightMm).toBe(900);
    expect(row.widthMm).toBe(800);
    expect(row.exteriorHeightMm).toBe(960);
    expect(row.exteriorWidthMm).toBe(860);
    expect(row.depthMm).toBe(70);
    const headers = measurementLineColumnPlan(sheet.groups[0]).columns.map((c) => c.header);
    expect(headers.some((h) => h.includes("interior"))).toBe(true);
    expect(headers.some((h) => h.includes("exterior"))).toBe(true);
    expect(headers.some((h) => h.includes("Profundidade"))).toBe(true);
  });

  it("porta América usa A B C D e esconde fixação vazia", () => {
    expect(formatMosquitoOpeningDisplay("A")).toBe("A");
    expect(formatMosquitoOpeningDisplay("ESQUERDA")).toBe("Esquerda");
    const sheet = buildMeasurementSheetFromPayload(
      { opportunityId: "o", clientName: "C", address: "A" },
      {
        groups: [
          {
            type: "MOSQUITEIRO",
            details: { model: "PORTA_AMERICA", mosquitoOpening: "C" },
            measurements: [{ qty: 1, width: 900, height: 2100, notes: "Hall" }],
          },
        ],
      }
    );
    expect(sheet.groups[0].suppressLineHardware).toBe(true);
    const headers = measurementLineColumnPlan(sheet.groups[0]).columns.map((c) => c.header);
    expect(headers).not.toContain("Fixação");
    expect(headers).not.toContain("Comandos");
    expect(sheet.groups[0].specDetailEntries?.some((e) => e.value === "C")).toBe(true);
  });
});
