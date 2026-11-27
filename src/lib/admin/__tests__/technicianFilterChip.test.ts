import { describe, expect, it } from "vitest";
import { technicianFilterBorderStyle } from "@/lib/admin/technicianFilterChip";
import { getTechnicianColor } from "@/lib/map/taskMarkerDescriptor";

describe("technicianFilterBorderStyle", () => {
  it("usa a mesma cor da bolinha do pino", () => {
    expect(technicianFilterBorderStyle("David Monteiro").borderColor).toBe(
      getTechnicianColor("David Monteiro")
    );
  });
});
