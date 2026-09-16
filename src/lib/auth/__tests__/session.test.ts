import { describe, expect, it } from "vitest";
import { canAccessCeoPanel, isAdminRole, isStrictAdminRole } from "../session";

describe("session role helpers", () => {
  it("isAdminRole inclui admin e ceo", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("ceo")).toBe(true);
    expect(isAdminRole("technician")).toBe(false);
  });

  it("isStrictAdminRole restringe observabilidade a admin", () => {
    expect(isStrictAdminRole("admin")).toBe(true);
    expect(isStrictAdminRole("ceo")).toBe(false);
    expect(isStrictAdminRole("technician")).toBe(false);
  });

  it("canAccessCeoPanel permite admin e ceo", () => {
    expect(canAccessCeoPanel("admin")).toBe(true);
    expect(canAccessCeoPanel("ceo")).toBe(true);
    expect(canAccessCeoPanel("technician")).toBe(false);
  });
});
