import { describe, expect, it } from "vitest";
import { computeRegressions } from "../regressions";
import type { E2ECheckResult } from "../e2eTypes";

function check(id: string, status: E2ECheckResult["status"]): E2ECheckResult {
  return {
    id,
    name: id,
    category: "APP",
    tier: "safe",
    status,
    latencyMs: 1,
    message: "",
  };
}

describe("computeRegressions", () => {
  it("detects checks that passed before and fail now", () => {
    const previous = [check("a", "PASS"), check("b", "WARN")];
    const current = [check("a", "FAIL"), check("b", "PASS")];
    expect(computeRegressions(previous, current)).toEqual(["a"]);
  });

  it("returns empty when no previous run", () => {
    expect(computeRegressions(undefined, [check("a", "FAIL")])).toEqual([]);
  });
});
