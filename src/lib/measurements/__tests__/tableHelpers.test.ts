import { describe, expect, it } from "vitest";
import type { MeasurementRow } from "@/types";
import {
  parseRowQty,
  measurementRowMobileTitle,
  rowExtrasShouldDefaultOpen,
  groupHasHardwareValues,
  groupHasLegacyOpeningValues,
} from "@/lib/measurements/tableHelpers";

const baseRow: MeasurementRow = {
  qty: "1",
  height: "",
  width: "",
  notes: "",
  price: "",
  fixation: "",
  controls: "",
};

describe("tableHelpers", () => {
  it("parseRowQty devolve pelo menos 1", () => {
    expect(parseRowQty("")).toBe(1);
    expect(parseRowQty("3")).toBe(3);
    expect(parseRowQty(0)).toBe(1);
  });

  it("measurementRowMobileTitle prioriza divisão", () => {
    const row = { ...baseRow, divisionCode: "SALA_ESTAR", divisionCustom: "" };
    expect(measurementRowMobileTitle(row, 2)).toBe("Sala de estar");
    expect(measurementRowMobileTitle(baseRow, 0)).toBe("Janela 1");
  });

  it("rowExtrasShouldDefaultOpen deteta fixação ou vão", () => {
    expect(rowExtrasShouldDefaultOpen(baseRow, false)).toBe(false);
    expect(rowExtrasShouldDefaultOpen({ ...baseRow, fixationCodes: "X" }, false)).toBe(true);
    expect(rowExtrasShouldDefaultOpen(baseRow, true)).toBe(true);
  });

  it("groupHasHardwareValues respeita porta América", () => {
    expect(groupHasHardwareValues([baseRow], false)).toBe(true);
    expect(groupHasHardwareValues([baseRow], true)).toBe(false);
    expect(
      groupHasHardwareValues([{ ...baseRow, controlsCodes: "E" }], true)
    ).toBe(true);
  });

  it("groupHasLegacyOpeningValues ignora modos opening/skylight", () => {
    expect(groupHasLegacyOpeningValues([{ ...baseRow, openingWidth: "100" }], false, "store")).toBe(
      true
    );
    expect(groupHasLegacyOpeningValues([{ ...baseRow, openingWidth: "100" }], true, "store")).toBe(
      false
    );
    expect(
      groupHasLegacyOpeningValues([{ ...baseRow, openingWidth: "100" }], false, "skylight")
    ).toBe(false);
  });
});