import { describe, it, expect } from "vitest";
import { canViewMeasurementSheets } from "@/actions/measurements/shared";

describe("measurements export RBAC", () => {
  it("permite armazém e admin", () => {
    expect(canViewMeasurementSheets("warehouse")).toBe(true);
    expect(canViewMeasurementSheets("admin")).toBe(true);
    expect(canViewMeasurementSheets("member")).toBe(true);
  });

  it("nega técnico", () => {
    expect(canViewMeasurementSheets("technician")).toBe(false);
  });
});

function parseVersionParam(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

describe("measurements export version query", () => {
  it("aceita versão positiva", () => {
    expect(parseVersionParam("3")).toBe(3);
  });

  it("rejeita versão inválida", () => {
    expect(parseVersionParam("0")).toBe(null);
    expect(parseVersionParam("abc")).toBe(null);
  });
});