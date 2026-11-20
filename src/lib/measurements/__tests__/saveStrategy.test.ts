import { describe, expect, it } from "vitest";
import { resolveTechnicianSheetSaveStrategy } from "@/lib/measurements/repo";

const TASK_A = "11111111-1111-1111-1111-111111111111";
const TASK_B = "22222222-2222-2222-2222-222222222222";

const techLatest = {
  id: "sheet-1",
  version: 1,
  taskId: TASK_A,
  editedByName: null as string | null,
};

describe("resolveTechnicianSheetSaveStrategy", () => {
  it("atualiza na mesma visita quando a última versão é do técnico", () => {
    expect(
      resolveTechnicianSheetSaveStrategy({
        taskId: TASK_A,
        latestSheet: techLatest,
      })
    ).toBe("update");
  });

  it("cria versão nova noutra visita", () => {
    expect(
      resolveTechnicianSheetSaveStrategy({
        taskId: TASK_B,
        latestSheet: techLatest,
      })
    ).toBe("insert");
  });

  it("cria versão nova quando a última foi editada pelo admin", () => {
    expect(
      resolveTechnicianSheetSaveStrategy({
        taskId: TASK_A,
        latestSheet: { ...techLatest, version: 2, editedByName: "Admin" },
      })
    ).toBe("insert");
  });

  it("cria versão nova quando é gravação de admin", () => {
    expect(
      resolveTechnicianSheetSaveStrategy({
        taskId: TASK_A,
        editedByName: "Admin",
        latestSheet: techLatest,
      })
    ).toBe("insert");
  });

  it("cria primeira versão sem histórico", () => {
    expect(
      resolveTechnicianSheetSaveStrategy({
        taskId: TASK_A,
        latestSheet: null,
      })
    ).toBe("insert");
  });
});