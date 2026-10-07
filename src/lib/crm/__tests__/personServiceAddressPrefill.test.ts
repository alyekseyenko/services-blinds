import { describe, expect, it } from "vitest";
import { resolveServiceAddressPrefill } from "../personServiceAddressPrefill";

describe("resolveServiceAddressPrefill", () => {
  const client = {
    addressStreet1: "Rua do Cliente 1",
    addressCity: "Lisboa",
    addressCountry: "Portugal",
  };

  const lastService = {
    addressStreet1: "Obra n.º 2",
    addressCity: "Sintra",
    addressCountry: "Portugal",
  };

  it("prefers Person morada over last opportunity service address", () => {
    expect(resolveServiceAddressPrefill(client, lastService)?.addressStreet1).toBe(
      "Rua do Cliente 1"
    );
  });

  it("falls back to last service address when client morada is empty", () => {
    expect(
      resolveServiceAddressPrefill(
        { addressStreet1: "", addressCity: "", addressCountry: "Portugal" },
        lastService
      )?.addressCity
    ).toBe("Sintra");
  });
});
