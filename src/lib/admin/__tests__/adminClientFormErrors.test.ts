import { describe, expect, it } from "vitest";
import {
  mapCreateAdminClientServerError,
  validateCreateAdminClientInput,
} from "@/lib/admin/adminClientFormErrors";

const validMorada = {
  addressStreet1: "Rua Teste 1",
  addressCity: "Lisboa",
  addressCountry: "Portugal",
};

describe("validateCreateAdminClientInput", () => {
  it("aceita payload válido", () => {
    const result = validateCreateAdminClientInput({
      clientType: "PARTICULAR",
      firstName: "Ana",
      nif: "123456789",
      phoneCountryCode: "PT",
      phoneNational: "912345678",
      morada: validMorada,
    });
    expect(result.ok).toBe(true);
  });

  it("devolve erros por campo", () => {
    const result = validateCreateAdminClientInput({
      clientType: "PARTICULAR",
      firstName: "",
      nif: "12",
      phoneNational: "123",
      morada: { ...validMorada, addressStreet1: "" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.firstName).toBeTruthy();
      expect(result.fieldErrors.nif).toBeTruthy();
      expect(result.fieldErrors.phoneNational).toBeTruthy();
      expect(result.fieldErrors["morada.addressStreet1"]).toBeTruthy();
    }
  });
});

describe("mapCreateAdminClientServerError", () => {
  it("liga duplicado de e-mail ao campo email", () => {
    const { fieldErrors } = mapCreateAdminClientServerError(
      "Já existe um cliente com este e-mail no CRM."
    );
    expect(fieldErrors.email).toContain("e-mail");
  });
});
