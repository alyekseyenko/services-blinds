import { describe, expect, it } from "vitest";
import { formatNsi, formatServiceNumber } from "../serviceNumber";

describe("formatServiceNumber", () => {
  it("keeps a whole number from Twenty", () => {
    expect(formatServiceNumber(12)).toBe("12");
    expect(formatServiceNumber(12.0)).toBe("12");
    expect(formatServiceNumber("7")).toBe("7");
  });

  it("drops empty and invalid values", () => {
    expect(formatServiceNumber(null)).toBeUndefined();
    expect(formatServiceNumber("")).toBeUndefined();
    expect(formatServiceNumber(0)).toBeUndefined();
    expect(formatServiceNumber("N/A")).toBeUndefined();
  });
});

describe("formatNsi", () => {
  it("normaliza o NSI do Twenty e ignora N/A", () => {
    expect(formatNsi(3627)).toBe("3627");
    expect(formatNsi(3627.0)).toBe("3627");
    expect(formatNsi("N/A")).toBeUndefined();
    expect(formatNsi(0)).toBeUndefined();
  });
});
