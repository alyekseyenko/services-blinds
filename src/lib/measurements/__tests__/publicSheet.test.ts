import { describe, expect, it } from "vitest";
import { stripMeasurementSheetPrices } from "@/lib/measurements/publicSheet";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";

describe("stripMeasurementSheetPrices", () => {
  it("tira o preço e mantém as medidas", () => {
    const sheet: MeasurementSheet = {
      opportunityId: "11111111-1111-4111-8111-111111111111",
      clientName: "Cliente",
      address: "Rua",
      groups: [
        {
          productType: "ESTORE_EXTERIOR",
          productLabel: "Estore Exterior",
          rows: [{ index: 1, qty: 1, widthMm: 1000, heightMm: 1200, price: "80" }],
        },
      ],
    };
    const stripped = stripMeasurementSheetPrices(sheet);
    expect(stripped.groups[0].rows[0].price).toBeUndefined();
    expect(stripped.groups[0].rows[0].widthMm).toBe(1000);
    expect(sheet.groups[0].rows[0].price).toBe("80");
  });
});
