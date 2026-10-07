import { describe, expect, it } from "vitest";
import { pickLineExtras } from "@/lib/measurements/extendedFields";
import { syncMeasurementRowLegacyFields } from "@/lib/measurements/rowPayload";

describe("measurement opening dimensions persist", () => {
  it("inclui vão em line_extra ao sincronizar linha", () => {
    const synced = syncMeasurementRowLegacyFields({
      qty: 1,
      width: "1200",
      height: "1500",
      openingWidth: "1250",
      openingHeight: "1550",
      notes: "Sala",
      fixation: "",
      controls: "",
      price: "",
    });
    const extras = pickLineExtras(synced as unknown as Record<string, unknown>);
    expect(extras.openingWidth).toBe("1250");
    expect(extras.openingHeight).toBe("1550");
  });
});
