import { describe, expect, it } from "vitest";
import {
  buildFairServiceTypeDurations,
  collectOnSiteDurationSamplesFromOpportunities,
  FAIR_ON_SITE_DURATION_MIN_SAMPLES,
  isValidOnSiteDurationMs,
  median,
  percentile80,
  shrinkTechnicianPercentile,
  type OnSiteDurationSample,
} from "@/lib/visits/onSiteDurationStats";

function samplesForRepair(durationsMin: number[], tech: string): OnSiteDurationSample[] {
  return durationsMin.map((min) => ({
    durationMs: min * 60_000,
    serviceType: "REPARACAO",
    technicianName: tech,
  }));
}

describe("percentile80", () => {
  it("usa o ponto dos 80% numa lista ordenada", () => {
    const p = percentile80([10, 20, 30, 40, 50].map((m) => m * 60_000));
    expect(p).toBe(40 * 60_000);
  });
});

describe("shrinkTechnicianPercentile", () => {
  it("encosta técnicos com poucas visitas ao valor da equipa", () => {
    const fleet = 70;
    const carla = shrinkTechnicianPercentile(2, 180, fleet);
    expect(carla).toBeCloseTo((2 * 180 + 5 * 70) / 7, 5);
    const ana = shrinkTechnicianPercentile(40, 50, fleet);
    expect(ana).toBeCloseTo((40 * 50 + 5 * 70) / 45, 5);
  });
});

describe("buildFairServiceTypeDurations", () => {
  it("recomenda a mediana dos técnicos encolhidos (exemplo Ana/Bruno/Carla)", () => {
    const ana = samplesForRepair(Array(40).fill(45), "Ana");
    const bruno = samplesForRepair(Array(30).fill(75), "Bruno");
    const carla = samplesForRepair([120, 240], "Carla");
  const filler = samplesForRepair(Array(FAIR_ON_SITE_DURATION_MIN_SAMPLES - 2).fill(70), "Outro");

    const fair = buildFairServiceTypeDurations([...ana, ...bruno, ...carla, ...filler]);
    const repair = fair.find((row) => row.serviceType === "REPARACAO");
    expect(repair).toBeDefined();

    const shrunkAna = shrinkTechnicianPercentile(40, 45 * 60_000, percentile80([...ana, ...bruno, ...carla, ...filler].map((s) => s.durationMs))!);
    const shrunkBruno = shrinkTechnicianPercentile(30, 75 * 60_000, percentile80([...ana, ...bruno, ...carla, ...filler].map((s) => s.durationMs))!);
    const shrunkCarla = shrinkTechnicianPercentile(2, 240 * 60_000, percentile80([...ana, ...bruno, ...carla, ...filler].map((s) => s.durationMs))!);
    const expected = median([shrunkAna, shrunkBruno, shrunkCarla, shrinkTechnicianPercentile(FAIR_ON_SITE_DURATION_MIN_SAMPLES - 2, 70 * 60_000, percentile80([...ana, ...bruno, ...carla, ...filler].map((s) => s.durationMs))!)]);
    expect(repair!.recommendedDurationMs).toBe(expected);
    expect(repair!.recommendedMinutes).toBeGreaterThanOrEqual(1);
  });

  it("omite tipos com menos de 5 visitas válidas", () => {
    const fair = buildFairServiceTypeDurations(samplesForRepair([30, 40], "Ana"));
    expect(fair).toHaveLength(0);
  });

  it("soma tarefas da mesma oportunidade e ignora serviços só incompletos", () => {
    const marker = (a: string, b: string) =>
      `x\n\n<!-- [VISIT_SITE_TIMES]${JSON.stringify({
        arrivedAt: a,
        closedAt: b,
        segments: [{ arrivedAt: a, closedAt: b }],
      })} -->`;

    const incompleteOnly = collectOnSiteDurationSamplesFromOpportunities([
      {
        stage: "REPARACAO",
        name: "Cliente A",
        taskTargets: {
          edges: [
            {
              node: {
                task: {
                  status: "INCOMPLETO",
                  title: "Reparação",
                  bodyV2: { markdown: marker("2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z") },
                },
              },
            },
          ],
        },
      },
    ]);
    expect(incompleteOnly).toHaveLength(0);

    const concluded = collectOnSiteDurationSamplesFromOpportunities([
      {
        stage: "REPARACAO",
        name: "Cliente B",
        taskTargets: {
          edges: [
            {
              node: {
                task: {
                  status: "INCOMPLETO",
                  title: "Reparação",
                  technicianName: "Ana",
                  bodyV2: { markdown: marker("2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z") },
                },
              },
            },
            {
              node: {
                task: {
                  status: "CONCLUIDO",
                  title: "Reparação",
                  technicianName: "Ana",
                  bodyV2: { markdown: marker("2026-01-03T10:00:00.000Z", "2026-01-03T11:30:00.000Z") },
                },
              },
            },
          ],
        },
      },
    ]);
    expect(concluded).toHaveLength(1);
    expect(concluded[0]!.durationMs).toBe(150 * 60_000);
    expect(isValidOnSiteDurationMs(5 * 60_000)).toBe(true);
  });
});
