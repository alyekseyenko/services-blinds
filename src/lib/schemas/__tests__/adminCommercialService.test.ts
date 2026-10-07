import { describe, expect, it } from "vitest";
import { CreateAdminCommercialServiceSchema } from "../adminCommercialService";

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
