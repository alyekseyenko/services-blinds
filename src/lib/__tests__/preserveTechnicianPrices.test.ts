import { describe, expect, it } from "vitest";
import { preservePricesForTechnicianSubmit } from "@/lib/measurements/preserveTechnicianPrices";

describe("preservePricesForTechnicianSubmit", () => {
  it("remove preços enviados pelo técnico e mantém os existentes", () => {
    const incoming = {
      groups: [
        {
          type: "ESTORE_EXTERIOR",
          measurements: [{ qty: 1, width: 100, height: 100, price: "999" }],
        },
      ],
    };
    const existing = {
      groups: [
        {
          type: "ESTORE_EXTERIOR",
          measurements: [{ qty: 1, width: 100, height: 100, price: "42" }],
        },
      ],
    };
    const out = preservePricesForTechnicianSubmit(incoming, existing);
    expect(out.groups[0].measurements[0].price).toBe("42");
  });

  it("sem ficha anterior, não grava preço do técnico", () => {
    const incoming = {
      groups: [
        {
          type: "ESTORE_EXTERIOR",
          measurements: [{ qty: 1, width: 100, height: 100, price: "50" }],
        },
      ],
    };
    const out = preservePricesForTechnicianSubmit(incoming, null);
    expect(out.groups[0].measurements[0].price).toBeUndefined();
  });
});
