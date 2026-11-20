import { describe, expect, it } from "vitest";
import { formatServiceNumber } from "../serviceNumber";

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
