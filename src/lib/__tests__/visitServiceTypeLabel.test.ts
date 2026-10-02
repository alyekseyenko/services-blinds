import { describe, expect, it } from "vitest";
import { formatVisitServiceTypeLabel } from "../visitServiceTypeLabel";

describe("formatVisitServiceTypeLabel", () => {
  it("usa serviceType explícito", () => {
    expect(formatVisitServiceTypeLabel({ serviceType: "INSTALACAO" })).toBe("Instalação");
  });

  it("infere do título quando falta serviceType", () => {
    expect(
      formatVisitServiceTypeLabel({ visitTitle: "Visita Técnica - Marcar instalação" })
    ).toBe("Instalação");
  });
});
