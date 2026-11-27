import { describe, expect, it } from "vitest";
import {
  pickRepresentativeTaskForOpportunity,
  resolveOpportunityTechnician,
} from "../opportunities";
import { CRM_TASK_STATUS } from "../contract";

describe("pickRepresentativeTaskForOpportunity", () => {
  it("uma visita agendada nova ganha a uma conclusão antiga da mesma oportunidade", () => {
    const picked = pickRepresentativeTaskForOpportunity([
      {
        id: "done",
        status: CRM_TASK_STATUS.CONCLUIDO,
        dueAt: "2026-09-01T09:00:00.000Z",
      },
      {
        id: "again",
        status: CRM_TASK_STATUS.AGENDADO,
        dueAt: "2026-11-12T09:00:00.000Z",
      },
    ]);
    expect(picked?.id).toBe("again");
  });

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

  it("prefere reagendamento ativo a tarefa cancelada", () => {
    const picked = pickRepresentativeTaskForOpportunity([
      {
        id: "cancelled",
        status: CRM_TASK_STATUS.CANCELADO,
        dueAt: "2026-10-06T21:00:00.000Z",
      },
      {
        id: "open",
        status: CRM_TASK_STATUS.POR_AGENDAR,
        dueAt: "2026-10-10T09:00:00.000Z",
      },
    ]);
    expect(picked?.id).toBe("open");
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

describe("resolveOpportunityTechnician", () => {
  it("mantém o técnico mesmo quando a visita representante já não está no mapa", () => {
    const done = {
      id: "done",
      status: CRM_TASK_STATUS.CONCLUIDO,
      dueAt: "2026-11-19T09:00:00.000Z",
      technicianName: "Hugo Lança",
      assigneeId: "hugo",
    };
    const leftover = {
      id: "leftover",
      status: CRM_TASK_STATUS.AGENDADO,
      dueAt: "2026-11-20T09:00:00.000Z",
    };
    expect(resolveOpportunityTechnician(leftover, [done, leftover])).toEqual({
      technician: "Hugo Lança",
      technicianId: "hugo",
      scheduledBy: undefined,
    });
  });

  it("usa o técnico da visita representante quando existe", () => {
    const active = {
      id: "active",
      status: CRM_TASK_STATUS.AGENDADO,
      technicianName: "David Monteiro",
      assigneeId: "david",
    };
    expect(resolveOpportunityTechnician(active, [active])).toEqual({
      technician: "David Monteiro",
      technicianId: "david",
      scheduledBy: undefined,
    });
  });

  it("fica Não Atribuído só quando nenhuma tarefa tem técnico", () => {
    expect(resolveOpportunityTechnician(null, [])).toEqual({
      technician: "Não Atribuído",
      technicianId: null,
      scheduledBy: undefined,
    });
  });
});
