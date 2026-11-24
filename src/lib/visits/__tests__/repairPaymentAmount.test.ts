import { describe, expect, it } from "vitest";
import {
  computeRepairPaymentWithVat,
  parseRepairPaymentAmountExVat,
  repairPaymentAmountFromInput,
} from "@/lib/visits/repairPaymentAmount";

describe("repairPaymentAmount", () => {
  it("interpreta vírgula, ponto e milhares em pt-PT", () => {
    expect(parseRepairPaymentAmountExVat("100")).toBe(100);
    expect(parseRepairPaymentAmountExVat("100,50")).toBe(100.5);
    expect(parseRepairPaymentAmountExVat("100.50")).toBe(100.5);
    expect(parseRepairPaymentAmountExVat("1.234,56")).toBe(1234.56);
  });

  it("rejeita vazio, zero e lixo", () => {
    expect(parseRepairPaymentAmountExVat("")).toBeNull();
    expect(parseRepairPaymentAmountExVat("   ")).toBeNull();
    expect(parseRepairPaymentAmountExVat("0")).toBeNull();
    expect(parseRepairPaymentAmountExVat("abc")).toBeNull();
  });

  it("arredonda o total com IVA aos cêntimos", () => {
    const breakdown = computeRepairPaymentWithVat(100.1);
    expect(breakdown).toEqual({
      exVatEuros: 100.1,
      vatEuros: 23.02,
      totalEuros: 123.12,
      amountMicros: 123_120_000,
    });
  });

  it("calcula 23% sobre 100 €", () => {
    const breakdown = repairPaymentAmountFromInput("100");
    expect(breakdown?.vatEuros).toBe(23);
    expect(breakdown?.totalEuros).toBe(123);
    expect(breakdown?.amountMicros).toBe(123_000_000);
  });
});