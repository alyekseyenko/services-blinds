import { describe, expect, it } from "vitest";
import { pickRepresentativeTaskForOpportunity } from "../opportunities";
import { CRM_TASK_STATUS } from "../contract";

describe("pickRepresentativeTaskForOpportunity", () => {
  it("prefere tarefa concluída quando existe reagendamento pendente", () => {
    const picked = pickRepresentativeTaskForOpportunity([
      {
        id: "new",
        status: CRM_TASK_STATUS.POR_AGENDAR,
        dueAt: "2026-10-10T09:00:00.000Z",
      },
      {
        id: "done",
        status: CRM_TASK_STATUS.CONCLUIDO,
        dueAt: "2026-10-02T11:00:00.000Z",
      },
    ]);
    expect(picked?.id).toBe("done");
  });

  it("entre terminais escolhe a visita mais recente por dueAt", () => {
    const picked = pickRepresentativeTaskForOpportunity([
      {
        id: "older",
        status: CRM_TASK_STATUS.CONCLUIDO,
        dueAt: "2026-09-01T09:00:00.000Z",
      },
      {
        id: "newer",
        status: CRM_TASK_STATUS.CONCLUIDO,
        dueAt: "2026-10-02T09:00:00.000Z",
      },
    ]);
    expect(picked?.id).toBe("newer");
  });
});
