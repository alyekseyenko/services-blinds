import { describe, expect, it } from "vitest";
import { MeasurementsPayloadSchema } from "@/lib/schemas";

describe("MeasurementsPayloadSchema", () => {
  it("mantém tecido, referência, outro material e preço", () => {
    const parsed = MeasurementsPayloadSchema.parse({
      groups: [
        {
          type: "ESTORE_INTERIOR",
          details: {
            material: "OUTRO",
            otherMaterial: "Madeira",
            fabric: "Linho",
            reference: "REF-1",
            model: "ROLO",
          },
          measurements: [
            {
              qty: 1,
              width: 1000,
              height: 1200,
              price: "150",
            },
          ],
        },
      ],
    });

    expect(parsed.groups[0].details?.otherMaterial).toBe("Madeira");
    expect(parsed.groups[0].details?.fabric).toBe("Linho");
    expect(parsed.groups[0].details?.reference).toBe("REF-1");
    expect(parsed.groups[0].measurements[0].price).toBe("150");
  });
});
