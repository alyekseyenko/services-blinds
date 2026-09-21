import { describe, expect, it } from "vitest";
import {
  canAccessAdminPanel,
  canAccessCeoPanel,
  isAdminRole,
  isStrictAdminRole,
} from "../session";

describe("session role helpers", () => {
  it("canAccessAdminPanel inclui admin, member e ceo", () => {
    expect(canAccessAdminPanel("admin")).toBe(true);
    expect(canAccessAdminPanel("member")).toBe(true);
    expect(canAccessAdminPanel("ceo")).toBe(true);
    expect(canAccessAdminPanel("technician")).toBe(false);
  });

  it("isAdminRole segue o painel operacional", () => {
    expect(isAdminRole("member")).toBe(true);
    expect(isAdminRole("technician")).toBe(false);
  });

  it("isStrictAdminRole restringe observabilidade a admin", () => {
    expect(isStrictAdminRole("admin")).toBe(true);
    expect(isStrictAdminRole("member")).toBe(false);
    expect(isStrictAdminRole("ceo")).toBe(false);
    expect(isStrictAdminRole("technician")).toBe(false);
  });

  it("canAccessCeoPanel permite admin e ceo mas não member", () => {
    expect(canAccessCeoPanel("admin")).toBe(true);
    expect(canAccessCeoPanel("ceo")).toBe(true);
    expect(canAccessCeoPanel("member")).toBe(false);
    expect(canAccessCeoPanel("technician")).toBe(false);
  });
});
