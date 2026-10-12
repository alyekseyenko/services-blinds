import { describe, expect, it } from "vitest";
import {
  CreateAdminCommercialServiceSchema,
  CreateAdminClientSchema,
} from "../adminCommercialService";

const basePayload = {
  clientRequestId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  personId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  serviceType: "TIRAR_MEDIDAS" as const,
  address: {
    addressStreet1: "Rua A",
    addressCity: "Lisboa",
    addressCountry: "Portugal",
  },
};

const baseClient = {
  clientType: "PARTICULAR" as const,
  firstName: "Ana",
  lastName: "Silva",
  nif: "123456789",
  phoneCountryCode: "PT",
  phoneNational: "912345678",
  morada: {
    addressStreet1: "Rua B",
    addressCity: "Porto",
    addressCountry: "Portugal",
  },
};

describe("CreateAdminCommercialServiceSchema", () => {
  it("accepts payload without nsi", () => {
    const parsed = CreateAdminCommercialServiceSchema.safeParse(basePayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.nsi).toBeUndefined();
  });

  it("accepts positive integer nsi", () => {
    const parsed = CreateAdminCommercialServiceSchema.safeParse({ ...basePayload, nsi: 12045 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.nsi).toBe(12045);
  });

  it("rejects invalid nsi", () => {
    const parsed = CreateAdminCommercialServiceSchema.safeParse({ ...basePayload, nsi: 0 });
    expect(parsed.success).toBe(false);
  });
});

describe("CreateAdminClientSchema", () => {
  it("aceita particular com NIF, telefone e morada", () => {
    expect(CreateAdminClientSchema.safeParse(baseClient).success).toBe(true);
    expect(
      CreateAdminClientSchema.safeParse({ ...baseClient, email: "a@example.com" }).success
    ).toBe(true);
  });

  it("exige NIF com 9 dígitos e telemóvel válido", () => {
    expect(CreateAdminClientSchema.safeParse({ ...baseClient, nif: "123" }).success).toBe(false);
    expect(
      CreateAdminClientSchema.safeParse({ ...baseClient, phoneNational: "123" }).success
    ).toBe(false);
    expect(CreateAdminClientSchema.safeParse({ ...baseClient, firstName: "" }).success).toBe(
      false
    );
  });

  it("empresa usa os mesmos campos que particular", () => {
    expect(
      CreateAdminClientSchema.safeParse({
        ...baseClient,
        clientType: "EMPRESA",
      }).success
    ).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    const parsed = CreateAdminClientSchema.safeParse({
      ...baseClient,
      email: "não-é-email",
    });
    expect(parsed.success).toBe(false);
  });
});
