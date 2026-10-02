import { describe, expect, it } from "vitest";
import { runLuxuryWorkflow } from "../runLuxuryWorkflow";

describe("runLuxuryWorkflow", () => {
  it("refuses to run when LUXURY_E2E_ENABLED is not true", async () => {
    const previous = process.env.LUXURY_E2E_ENABLED;
    delete process.env.LUXURY_E2E_ENABLED;

    await expect(
      runLuxuryWorkflow("brazil-full-workflow", {
        userId: "member-1",
        userName: "Admin",
      })
    ).rejects.toThrow(/LUXURY_E2E_ENABLED/);

    if (previous) {
      process.env.LUXURY_E2E_ENABLED = previous;
    }
  });

  it("rejects unknown scenario ids", async () => {
    process.env.LUXURY_E2E_ENABLED = "true";

    await expect(
      runLuxuryWorkflow("unknown-scenario", {
        userId: "member-1",
        userName: "Admin",
      })
    ).rejects.toThrow(/Unknown luxury workflow scenario/);
  });
});
