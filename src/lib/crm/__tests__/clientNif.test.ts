import { describe, expect, it } from "vitest";
import { normalizeClientNif } from "@/lib/crm/clientNif";

describe("normalizeClientNif", () => {
  it("prefere o contacto e devolve 9 dígitos", () => {
    expect(normalizeClientNif({ nif: "123.456.789" }, { nif: "111111111" })).toBe("123456789");
  });

  it("cai na pessoa se o contacto não tiver NIF", () => {
    expect(normalizeClientNif(null, { nif: "123456789" })).toBe("123456789");
  });

  it("omite vazio", () => {
    expect(normalizeClientNif(null, null)).toBeUndefined();
  });
});