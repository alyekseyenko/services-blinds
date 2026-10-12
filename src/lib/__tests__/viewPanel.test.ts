import { describe, expect, it } from "vitest";
import { viewPanelStackClass } from "@/lib/ui/viewPanel";

describe("viewPanelStackClass", () => {
  it("esconde painéis inactivos com hidden", () => {
    expect(viewPanelStackClass(false, "absolute inset-0")).toContain("hidden");
    expect(viewPanelStackClass(true, "absolute inset-0")).not.toContain("hidden");
    expect(viewPanelStackClass(true, "absolute inset-0")).toContain("bg-background");
  });
});
