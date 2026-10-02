import { describe, expect, it } from "vitest";
import { technicianTaskDueDateWindow } from "@/lib/crm/technicianTaskWindow";

describe("technicianTaskDueDateWindow", () => {
  it("devolve intervalo UTC com início antes do fim", () => {
    const { dueFrom, dueTo } = technicianTaskDueDateWindow();
    expect(new Date(dueFrom).getTime()).toBeLessThan(new Date(dueTo).getTime());
  });
});
