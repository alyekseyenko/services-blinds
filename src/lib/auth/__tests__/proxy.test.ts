import { describe, expect, it } from "vitest";
import {
  canAccessAdminPanel,
  canAccessCeoPanel,
  canAccessTechnicianDashboard,
  isStrictAdminRole,
  isWarehouseRole,
} from "@/lib/auth/rbac";

describe("proxy RBAC helpers", () => {
  it("member reaches admin but not CEO or SRE", () => {
    expect(canAccessAdminPanel("member")).toBe(true);
    expect(canAccessCeoPanel("member")).toBe(false);
    expect(isStrictAdminRole("member")).toBe(false);
  });

  it("ceo reaches admin and CEO but not strict admin APIs", () => {
    expect(canAccessAdminPanel("ceo")).toBe(true);
    expect(canAccessCeoPanel("ceo")).toBe(true);
    expect(isStrictAdminRole("ceo")).toBe(false);
  });

  it("admin has full operational and SRE access", () => {
    expect(isStrictAdminRole("admin")).toBe(true);
    expect(canAccessCeoPanel("admin")).toBe(true);
  });

  it("technician dashboard allows technician and admin impersonation", () => {
    expect(canAccessTechnicianDashboard("technician")).toBe(true);
    expect(canAccessTechnicianDashboard("admin")).toBe(true);
    expect(canAccessTechnicianDashboard("member")).toBe(false);
  });

  it("warehouse role is isolated from technician dashboard", () => {
    expect(isWarehouseRole("warehouse")).toBe(true);
    expect(canAccessTechnicianDashboard("warehouse")).toBe(false);
  });
});
