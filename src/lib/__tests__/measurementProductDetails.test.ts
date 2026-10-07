import { describe, expect, it } from "vitest";
import {
  sanitizeGroupDetailsForType,
  sanitizeGroupDetailsOnProductTypeChange,
} from "@/lib/measurementProductDetails";

describe("sanitizeGroupDetailsForType", () => {
  it("remove material ao mudar para estore interior", () => {
    const details = sanitizeGroupDetailsForType("ESTORE_INTERIOR", {
      material: "PVC",
      model: "ROLO",
      ral: "7016",
    });

    expect(details.material).toBe("");
    expect(details.model).toBe("ROLO");
    expect(details.ral).toBe("");
  });

  it("ao mudar de mosquiteiro para toldo não herda o modelo", () => {
    const details = sanitizeGroupDetailsOnProductTypeChange(
      "TOLDO",
      "MOSQUITEIRO",
      {
        model: "PORTA_AMERICA",
        fabric: "Rede X",
        mosquitoOpening: "ESQUERDA",
        observations: "Nota útil",
      }
    );

    expect(details.model).toBe("");
    expect(details.fabric).toBe("");
    expect(details.mosquitoOpening).toBeUndefined();
    expect(details.observations).toBe("Nota útil");
  });

  it("mantém material só em estore exterior", () => {
    const details = sanitizeGroupDetailsForType("ESTORE_EXTERIOR", {
      material: "PVC",
      model: "ROLO",
      ral: "7016",
    });

    expect(details.material).toBe("PVC");
    expect(details.model).toBe("");
    expect(details.ral).toBe("7016");
  });
});
