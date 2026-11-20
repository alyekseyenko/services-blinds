import { describe, expect, it } from "vitest";
import { pickTaskForMeasurement, taskIdFromCrmTask } from "@/lib/measurements/measurementTask";

describe("measurementTask", () => {
  it("escolhe a task pedida", () => {
    const tasks = [
      { id: "aaa", technicianName: "João" },
      { id: "bbb", technicianName: "Maria" },
    ];
    expect(pickTaskForMeasurement(tasks, "bbb")?.id).toBe("bbb");
  });

  it("cai na primeira task sem id", () => {
    const tasks = [{ id: "only-one" }];
    expect(pickTaskForMeasurement(tasks)?.id).toBe("only-one");
  });

  it("devolve null sem tasks", () => {
    expect(pickTaskForMeasurement([])).toBeNull();
    expect(taskIdFromCrmTask(null)).toBeNull();
  });
});