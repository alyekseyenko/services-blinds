import { describe, expect, it } from "vitest";
import {
  formatExteriorOpeningAndStoreDisplay,
  formatExteriorPartialPartsDisplay,
} from "@/lib/measurements/exteriorInstall";
import { buildMeasurementSheetFromPayload } from "@/lib/measurementSheetBuilder";

describe("exteriorInstall", () => {
  it("formata vão e estore para export", () => {
    expect(formatExteriorOpeningAndStoreDisplay("1250", "1550", "1200", "1500")).toBe(
      "2450×3050 mm"
    );
    expect(formatExteriorOpeningAndStoreDisplay("777", "7771", "5555", "222")).toBe(
      "6332×7993 mm"
    );
  });

  it("formata peças parciais com Outros", () => {
    expect(
      formatExteriorPartialPartsDisplay("CALHAS,OUTROS", "Calha especial")
    ).toContain("Calhas");
    expect(
      formatExteriorPartialPartsDisplay("CALHAS,OUTROS", "Calha especial")
    ).toContain("Calha especial");
  });

  it("inclui dimensão de vão na ficha", () => {
    const sheet = buildMeasurementSheetFromPayload(
      {
        opportunityId: "opp-1",
        clientName: "Cliente",
        address: "Rua",
      },
      {
        groups: [
          {
            type: "ESTORE_EXTERIOR",
            details: {
              exteriorInstallType: "COMPLETO",
              material: "PVC",
              activation: "MANUAL",
            },
            measurements: [
              {
                qty: 1,
                width: 1200,
                height: 1500,
                openingWidth: "1250",
                openingHeight: "1550",
                notes: "Sala",
              },
            ],
          },
        ],
      }
    );

    expect(sheet.groups[0].exteriorInstallLabel).toBe("Completo");
    expect(sheet.groups[0].rows[0].openingWidthMm).toBe(1250);
    expect(sheet.groups[0].rows[0].openingHeightMm).toBe(1550);
    expect(sheet.groups[0].rows[0].openingDimensionLabel).toBe("2450×3050 mm");
  });
});
