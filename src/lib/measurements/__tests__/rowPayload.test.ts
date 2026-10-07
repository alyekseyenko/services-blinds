import { describe, expect, it } from "vitest";
import { getDivisionLabel } from "../divisions";
import { syncMeasurementRowLegacyFields } from "../rowPayload";

describe("syncMeasurementRowLegacyFields", () => {
  it("preenche notes/fixation/controls a partir dos códigos estruturados", () => {
    const row = syncMeasurementRowLegacyFields({
      qty: 1,
      width: "1000",
      height: "1200",
      fixation: "",
      controls: "",
      notes: "",
      price: "",
      divisionCode: "COZINHA",
      divisionCustom: "",
      fixationCodes: "PAREDE,TETO",
      fixationCustom: "",
      controlsCodes: "ESQUERDA",
      controlsCustom: "",
    });
    expect(row.notes).toBe(getDivisionLabel("COZINHA"));
    expect(row.fixation).toContain("Parede");
    expect(row.controls).toContain("Esquerda");
  });
});
