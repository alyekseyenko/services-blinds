import { describe, expect, it } from "vitest";
import { formatAdminClientSearchSubtitle } from "@/lib/admin/clientSearchHitDisplay";
import type { AdminClientSearchHit } from "@/lib/schemas/adminCommercialService";

describe("formatAdminClientSearchSubtitle", () => {
  it("junta telefone, NIF e localização", () => {
    const hit: AdminClientSearchHit = {
      id: "1",
      displayName: "Maria Silva",
      phone: "+351 912345678",
      email: "maria@example.com",
      nif: "123456789",
      addressPostcode: "4000-123",
      addressCity: "Porto",
    };
    const line = formatAdminClientSearchSubtitle(hit);
    expect(line).toContain("+351 912345678");
    expect(line).toContain("NIF 123456789");
    expect(line).toContain("4000-123");
    expect(line).toContain("Porto");
  });
});