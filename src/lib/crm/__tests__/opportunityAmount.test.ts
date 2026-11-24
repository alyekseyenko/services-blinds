import { describe, expect, it } from "vitest";
import { opportunityEurosFromAmountMicros } from "@/lib/crm/opportunityAmount";

describe("opportunityEurosFromAmountMicros", () => {
  it("converte micros do Twenty para euros", () => {
    expect(opportunityEurosFromAmountMicros(123_000_000)).toBe(123);
    expect(opportunityEurosFromAmountMicros(123_120_000)).toBe(123.12);
    expect(opportunityEurosFromAmountMicros("123000000")).toBe(123);
  });

  it("devolve undefined quando vazio", () => {
    expect(opportunityEurosFromAmountMicros(0)).toBeUndefined();
    expect(opportunityEurosFromAmountMicros(null)).toBeUndefined();
  });
});