import { describe, expect, it } from "vitest";
import {
  buildAgendaSnapshotItem,
  diffAgendaSnapshots,
  diffPipelineSnapshots,
  formatAgendaDiffToast,
  toSafeIso,
} from "../agendaDiff";
import { CRM_STAGES } from "../crm/contract";
import { detectLateVisits } from "../agendaLateNotify";

describe("toSafeIso", () => {
  it("returns empty string for invalid dates", () => {
    expect(toSafeIso("not-a-date")).toBe("");
    expect(toSafeIso(null)).toBe("");
  });

  it("returns ISO for valid dates", () => {
    expect(toSafeIso("2026-01-01T10:00:00Z")).toBe("2026-01-01T10:00:00.000Z");
  });
});

describe("diffAgendaSnapshots", () => {
  it("detects first visit when previous snapshot was empty", () => {
    const events = diffAgendaSnapshots(
      [],
      [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "AGENDADO", label: "Cliente A" }]
    );
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("nova");
  });

  it("detects new visits", () => {
    const events = diffAgendaSnapshots(
      [],
      [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "POR_AGENDAR", label: "Cliente A" }]
    );
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("nova");
  });

  it("detects reschedule", () => {
    const prev = [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "POR_AGENDAR", label: "A" }];
    const next = [{ id: "1", dueAt: "2026-01-01T11:00:00Z", status: "POR_AGENDAR", label: "A" }];
    expect(diffAgendaSnapshots(prev, next)[0].kind).toBe("reagendada");
  });

  it("trata remoção de data como cancelamento (admin cancela agendamento)", () => {
    const prev = [
      {
        id: "1",
        dueAt: "2026-01-01T10:00:00Z",
        status: "AGENDADO",
        label: "Maria Silva · NSI 1",
      },
    ];
    const next = [{ id: "1", dueAt: "", status: "AGENDADO", label: "Maria Silva · NSI 1" }];
    expect(diffAgendaSnapshots(prev, next)[0].kind).toBe("cancelada");
  });

  it("detects removal", () => {
    const prev = [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "POR_AGENDAR", label: "A" }];
    expect(diffAgendaSnapshots(prev, [])[0].kind).toBe("removida");
  });

  it("detecta visita em curso (chegada ao local)", () => {
    const prev = [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "AGENDADO", label: "Cliente A" }];
    const next = [
      {
        id: "1",
        dueAt: "2026-01-01T10:00:00Z",
        status: "EM_CURSO",
        label: "Cliente A",
        technicianName: "João Silva",
      },
    ];
    const events = diffAgendaSnapshots(prev, next);
    expect(events[0].kind).toBe("em_curso");
    expect(events[0].detail).toBe("João Silva chegou ao local.");
    const copy = formatAgendaDiffToast(events[0]);
    expect(copy.title).toBe("Visita em curso");
    expect(copy.description).toContain("João Silva");
  });

  it("concluída não reutiliza nota de chegada do CRM", () => {
    const prev = [
      { id: "1", dueAt: "2026-01-01T10:00:00Z", status: "EM_CURSO", label: "A" },
    ];
    const next = [
      {
        id: "1",
        dueAt: "2026-01-01T10:00:00Z",
        status: "CONCLUIDO",
        label: "A",
        technicianName: "João Silva",
        statusNote: "Técnico chegou ao local.",
      },
    ];
    const ev = diffAgendaSnapshots(prev, next).find((e) => e.kind === "concluida");
    expect(ev?.detail).toBe("João Silva terminou o serviço e saiu do local.");
  });

  it("detecta visita concluída", () => {
    const prev = [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "AGENDADO", label: "A" }];
    const next = [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "CONCLUIDO", label: "A" }];
    expect(diffAgendaSnapshots(prev, next)[0].kind).toBe("concluida");
  });

  it("não renotifica visita já terminal que saiu da lista", () => {
    const prev = [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "CONCLUIDO", label: "A" }];
    expect(diffAgendaSnapshots(prev, [])).toHaveLength(0);
  });

  it("não emite nova visita quando a tarefa já aparece terminal", () => {
    const events = diffAgendaSnapshots(
      [],
      [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "CONCLUIDO", label: "A" }]
    );
    expect(events).toHaveLength(0);
  });

  it("usa dueAt anterior em conclusão quando o próximo snapshot vem sem data", () => {
    const prev = [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "AGENDADO", label: "A" }];
    const next = [{ id: "1", dueAt: "", status: "CONCLUIDO", label: "A" }];
    const events = diffAgendaSnapshots(prev, next);
    expect(events[0].kind).toBe("concluida");
    expect(events[0].dueAt).toBe("2026-01-01T10:00:00Z");
  });

  it("detecta reatribuição de técnico", () => {
    const prev = [
      {
        id: "1",
        dueAt: "2026-01-01T10:00:00Z",
        status: "AGENDADO",
        label: "Cliente",
        assigneeId: "tech-a",
        technicianName: "Ana",
      },
    ];
    const next = [
      {
        id: "1",
        dueAt: "2026-01-01T10:00:00Z",
        status: "AGENDADO",
        label: "Cliente",
        assigneeId: "tech-b",
        technicianName: "Bruno",
      },
    ];
    expect(diffAgendaSnapshots(prev, next).some((e) => e.kind === "reatribuida")).toBe(true);
  });

  it("detecta serviço extra criado no local", () => {
    const prev = [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "EM_CURSO", label: "A" }];
    const next = [
      {
        id: "1",
        dueAt: "2026-01-01T10:00:00Z",
        status: "EM_CURSO",
        label: "A",
        onSiteOpportunityIds: ["opp-extra"],
        onSiteServices: [
          { opportunityId: "opp-extra", serviceType: "REPARACAO", mode: "now" as const },
        ],
      },
    ];
    const events = diffAgendaSnapshots(prev, next);
    const extra = events.find((e) => e.kind === "servico_extra");
    expect(extra?.opportunityId).toBe("opp-extra");
    expect(extra?.detail).toContain("Reparação");
  });

  it("inclui motivo em incompleta quando há statusNote", () => {
    const prev = [{ id: "1", dueAt: "2026-01-01T10:00:00Z", status: "EM_CURSO", label: "A" }];
    const next = [
      {
        id: "1",
        dueAt: "2026-01-01T10:00:00Z",
        status: "INCOMPLETO",
        label: "A",
        statusNote: "Cliente ausente",
      },
    ];
    const ev = diffAgendaSnapshots(prev, next).find((e) => e.kind === "incompleta");
    expect(ev?.detail).toBe("Cliente ausente");
  });

  it("detecta armazém pronto na pipeline", () => {
    const prev = [
      {
        opportunityId: "opp-1",
        stage: CRM_STAGES.PREPARACAO,
        label: "Cliente · NSI 1",
      },
    ];
    const next = [
      {
        opportunityId: "opp-1",
        stage: CRM_STAGES.MARCAR_INSTALACAO,
        label: "Cliente · NSI 1",
      },
    ];
    expect(diffPipelineSnapshots(prev, next)[0].kind).toBe("armazem_pronto");
  });

  it("detecta visita atrasada", () => {
    const dueAt = "2026-01-01T10:00:00Z";
    const now = new Date("2026-01-01T11:00:00Z").getTime();
    const events = detectLateVisits(
      [{ id: "1", dueAt, status: "AGENDADO", label: "Cliente" }],
      now
    );
    expect(events[0].kind).toBe("atrasada");
  });

  it("formata cancelamento com cliente, NSI e hora", () => {
    const item = buildAgendaSnapshotItem({
      id: "1",
      dueAt: "2026-06-15T14:30:00.000Z",
      status: "CANCELADO",
      client: "Maria Silva",
      nsi: "12345",
      visitTitle: "Medição estores",
    });
    const copy = formatAgendaDiffToast({
      kind: "cancelada",
      id: item.id,
      label: item.label,
      dueAt: item.dueAt,
    });
    expect(copy.title).toBe("Visita cancelada");
    expect(copy.description).toContain("Maria Silva");
    expect(copy.description).toContain("NSI 12345");
    expect(copy.description).toContain("Medição");
  });
});
