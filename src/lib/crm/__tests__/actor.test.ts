import { describe, expect, it } from "vitest";
import { crmManualCreatedBy } from "../actor";

describe("crmManualCreatedBy", () => {
  it("builds Twenty MANUAL actor payload", () => {
    expect(
      crmManualCreatedBy({ name: "Ana Silva", workspaceMemberId: "wm-1" })
    ).toEqual({
      source: "MANUAL",
      name: "Ana Silva",
      workspaceMemberId: "wm-1",
      context: {},
    });
  });
});
