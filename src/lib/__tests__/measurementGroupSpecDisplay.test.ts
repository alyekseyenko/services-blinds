import { describe, expect, it } from "vitest";
import { getGroupSpecDetailEntries } from "@/lib/measurementGroupSpecDisplay";
import { buildMeasurementSheetFromPayload } from "@/lib/measurementSheetBuilder";
import { getMeasurementGroupDetailEntries } from "@/lib/measurementSheetDisplay";

describe("getGroupSpecDetailEntries", () => {
  it("inclui detalhes RTS na ficha", () => {
    const entries = getGroupSpecDetailEntries("ESTORE_INTERIOR", {
      activation: "MOTOR_RTS",
      rtsCommandMode: "VARIOS_CANAIS",
      rtsChannelCount: "5",
      rtsMotorBrand: "SOMFY",
    });
    const labels = entries.map((e) => e.label);
    expect(labels).toContain("Comandos RTS");
    expect(labels).toContain("Canais RTS");
    expect(labels).toContain("Marca motor / comando");
    expect(entries.find((e) => e.label === "Comandos RTS")?.value).toContain("Vários");
    expect(entries.find((e) => e.label === "Marca motor / comando")?.value).toBe("Somfy");
  });
});

describe("measurement sheet export labels", () => {
  it("propaga RTS para getMeasurementGroupDetailEntries", () => {
    const sheet = buildMeasurementSheetFromPayload(
      { opportunityId: "o", clientName: "C", address: "A" },
      {
        groups: [
          {
            type: "ESTORE_INTERIOR",
            details: {
              model: "ROLO",
              roloVariant: "EOS_LUXURY",
              activation: "MOTOR_RTS",
              rtsCommandMode: "UM_CANAL",
              rtsMotorBrand: "GAVIOTA",
            },
            measurements: [{ qty: 1, width: 100, height: 200 }],
          },
        ],
      }
    );
    const labels = getMeasurementGroupDetailEntries(sheet.groups[0]).map((e) => e.label);
    expect(labels).toContain("Comandos RTS");
    expect(labels).toContain("Marca motor / comando");
  });
});
