import { describe, expect, it } from "vitest";
import {
  appendTimelineEvent,
  formatTimelinePathShort,
  notificationMatchesFilter,
  resolveVisitPhase,
} from "../agendaVisitLifecycle";

describe("appendTimelineEvent", () => {
  it("não duplica o mesmo estado seguido", () => {
    const t0 = 1_000;
    let timeline = appendTimelineEvent([], { kind: "em_curso" }, t0);
    timeline = appendTimelineEvent(timeline, { kind: "em_curso" }, t0 + 100);
    expect(timeline).toHaveLength(1);
  });

  it("marca novo ciclo após reagendamento com incompleta anterior", () => {
    let timeline = appendTimelineEvent([], { kind: "incompleta" }, 100);
    timeline = appendTimelineEvent(timeline, { kind: "reagendada" }, 200);
    expect(timeline[1].cycleBreak).toBe(true);
  });

  it("resolve atraso quando entra em curso", () => {
    let timeline = appendTimelineEvent([], { kind: "atrasada" }, 100);
    timeline = appendTimelineEvent(timeline, { kind: "em_curso" }, 200);
    const phase = resolveVisitPhase(timeline);
    expect(phase.phase).toBe("em_curso");
  });
});

describe("resolveVisitPhase", () => {
  it("ignora serviço extra para a fase", () => {
    const timeline = [
      { kind: "em_curso" as const, at: 1 },
      { kind: "servico_extra" as const, at: 2, detail: "Reparação · feito agora" },
    ];
    expect(resolveVisitPhase(timeline).phase).toBe("em_curso");
  });

  it("filtra activas e problemas", () => {
    expect(notificationMatchesFilter("em_curso", "active")).toBe(true);
    expect(notificationMatchesFilter("concluida", "active")).toBe(false);
    expect(notificationMatchesFilter("incompleta", "problems")).toBe(true);
    expect(notificationMatchesFilter("concluida", "done")).toBe(true);
  });
});

describe("formatTimelinePathShort", () => {
  it("compacta passos repetidos", () => {
    const path = formatTimelinePathShort([
      { kind: "em_curso", at: 1 },
      { kind: "em_curso", at: 2 },
      { kind: "concluida", at: 3 },
    ]);
    expect(path).toContain("Concluída");
  });
});
