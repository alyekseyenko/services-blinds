import { describe, expect, it } from "vitest";
import {
  hasValidAdminClientContact,
  normalizeAdminPhoneDigits,
  parseAdminClientPhoneForTwenty,
} from "@/lib/admin/adminClientInput";

describe("adminClientInput", () => {
  it("normaliza dígitos do telefone", () => {
    expect(normalizeAdminPhoneDigits("+351 912 345 678")).toBe("351912345678");
  });

  it("parse telefone PT com indicativo", () => {
    expect(parseAdminClientPhoneForTwenty("351912345678")).toEqual({
      callingCode: "+351",
      number: "912345678",
    });
  });

  it("valida contacto mínimo", () => {
    expect(hasValidAdminClientContact("a@b.pt", "")).toBe(true);
    expect(hasValidAdminClientContact("", "912345678")).toBe(true);
    expect(hasValidAdminClientContact("", "123")).toBe(false);
  });
});
