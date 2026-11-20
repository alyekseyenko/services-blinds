import { describe, expect, it } from "vitest";
import { formatNavigationAddressLine, formatServiceAddressLine } from "../serviceAddressLine";

describe("formatServiceAddressLine", () => {
  it("inclui o endereço 2 entre a rua e a cidade", () => {
    expect(
      formatServiceAddressLine({
        addressStreet1: "Av. da Independência Nacional 19A",
        addressStreet2: "7º DT",
        addressCity: "caldas da rainha",
        addressPostcode: "2500-082",
      })
    ).toBe("Av. da Independência Nacional 19A, 7º DT, caldas da rainha, 2500-082");
  });

  it("a navegação fica sem o andar", () => {
    expect(
      formatNavigationAddressLine({
        addressStreet1: "RUA 1º DE MAIO, Nº1",
        addressStreet2: "2ºDIREITO",
        addressCity: "São Martinho do Porto",
        addressPostcode: "2460-675",
      })
    ).toBe("RUA 1º DE MAIO, Nº1, São Martinho do Porto, 2460-675");
  });

  it("omite o endereço 2 quando está vazio", () => {
    expect(
      formatServiceAddressLine({
        addressStreet1: "Rua A",
        addressStreet2: "  ",
        addressCity: "Lisboa",
      })
    ).toBe("Rua A, Lisboa");
  });
});
