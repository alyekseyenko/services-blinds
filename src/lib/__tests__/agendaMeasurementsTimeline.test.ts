import { describe, expect, it } from "vitest";
import { measurementsTimelineDetail } from "../agendaMeasurementsTimeline";
import { appendTimelineEvent, resolveVisitPhase } from "../agendaVisitLifecycle";

describe("agendaMeasurementsTimeline", () => {
  it("detalhe distingue online e offline", () => {
    expect(measurementsTimelineDetail(true)).toContain("sincronizadas");
    expect(measurementsTimelineDetail(false)).toContain("quando houver rede");
  });

  it("medições não alteram a fase do cartão", () => {
    const timeline = appendTimelineEvent(
      [{ kind: "em_curso", at: 100 }],
      { kind: "medicoes_guardadas", detail: "Medições sincronizadas com o CRM." },
      200
    );
    expect(resolveVisitPhase(timeline).phase).toBe("em_curso");
  });
});
