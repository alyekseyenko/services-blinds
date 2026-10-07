import { describe, expect, it } from "vitest";
import {
  formatInteriorModelDisplay,
  getActivationLabel,
  getMaterialLabel,
  getProductTypeLabel,
} from "@/lib/measurementLabels";

describe("measurementLabels", () => {
  it("traduz tipos de produto para pt-PT", () => {
    expect(getProductTypeLabel("ESTORE_EXTERIOR")).toBe("Estore Exterior");
  });

  it("usa texto livre para material Outro", () => {
    expect(getMaterialLabel("OUTRO", "Fibra custom")).toBe("Fibra custom");
  });

  it("traduz acionamento", () => {
    expect(getActivationLabel("MOTOR_RTS")).toBe("Motor RTS");
  });

  it("usa texto livre para acionamento Outros", () => {
    expect(getActivationLabel("OUTRO", "Motor genérico")).toBe("Motor genérico");
  });

  it("mostra subtipo de rolo no modelo interior", () => {
    expect(
      formatInteriorModelDisplay({ model: "ROLO", roloVariant: "EOS_LUXURY" })
    ).toBe("Rolo — EOS Luxury");
  });

  it("usa campo Extra para tipo de rolo Outros", () => {
    expect(
      formatInteriorModelDisplay({
        model: "ROLO",
        roloVariant: "OUTRO",
        otherRoloVariant: "Modelo especial",
      })
    ).toBe("Rolo — Modelo especial");
  });
});
