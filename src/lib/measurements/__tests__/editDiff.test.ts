import { describe, expect, it } from "vitest";
import { describeMeasurementEdits } from "@/lib/measurements/editDiff";

describe("describeMeasurementEdits", () => {
  it("descreve a medida que mudou", () => {
    const before = {
      groups: [
        {
          type: "ESTORE_EXTERIOR",
          details: { material: "PVC", ral: "7016" },
          measurements: [{ qty: 1, width: 2000, height: 2000, fixation: "Parede", controls: "Esquerda" }],
        },
      ],
    };
    const after = {
      groups: [
        {
          type: "ESTORE_EXTERIOR",
          details: { material: "PVC", ral: "9016" },
          measurements: [{ qty: 1, width: 2100, height: 2000, fixation: "Parede", controls: "Esquerda" }],
        },
      ],
    };
    expect(describeMeasurementEdits(before, after)).toEqual([
      "Produto 1, RAL / cor: 7016 → 9016.",
      "Produto 1, linha 1, Largura: 2000 → 2100.",
    ]);
  });
});
