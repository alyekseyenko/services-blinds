import { getServiceTypeColor } from "@/lib/techniciansConfig";
import {
  computeOnSiteDurationMs,
  formatOnSiteDurationPt,
  type VisitSiteTimes,
} from "@/lib/visits/siteTimes";

export type OnSiteDurationSample = {
  durationMs: number;
  serviceType: string;
  technicianName?: string;
};

export type OnSiteDurationSummary = {
  sampleCount: number;
  avgDurationMs: number | null;
  formattedAvg: string | null;
};

export function summarizeOnSiteDurations(samples: OnSiteDurationSample[]): OnSiteDurationSummary {
  if (samples.length === 0) {
    return { sampleCount: 0, avgDurationMs: null, formattedAvg: null };
  }
  const total = samples.reduce((sum, s) => sum + s.durationMs, 0);
  const avg = Math.round(total / samples.length);
  return {
    sampleCount: samples.length,
    avgDurationMs: avg,
    formattedAvg: formatOnSiteDurationPt(avg),
  };
}

export function durationFromVisitSiteTimes(
  times: VisitSiteTimes,
  serviceType: string,
  technicianName?: string
): OnSiteDurationSample | null {
  const durationMs = computeOnSiteDurationMs(times);
  if (durationMs === null) return null;
  return {
    durationMs,
    serviceType,
    technicianName: technicianName?.trim() || undefined,
  };
}

export type TechnicianOnSiteDurationRow = {
  name: string;
  sampleCount: number;
  avgMinutes: number;
  formattedAvg: string;
  byService: Array<{
    serviceType: string;
    serviceLabel: string;
    sampleCount: number;
    avgMinutes: number;
    formattedAvg: string;
  }>;
};

export function buildTechnicianOnSiteDurationRows(
  samples: OnSiteDurationSample[]
): TechnicianOnSiteDurationRow[] {
  const byTech = new Map<string, OnSiteDurationSample[]>();
  for (const sample of samples) {
    const name = sample.technicianName?.trim() || "Sem técnico";
    const list = byTech.get(name) ?? [];
    list.push(sample);
    byTech.set(name, list);
  }

  return [...byTech.entries()]
    .map(([name, techSamples]) => {
      const summary = summarizeOnSiteDurations(techSamples);
      const avgMinutes = summary.avgDurationMs
        ? Math.max(1, Math.round(summary.avgDurationMs / 60_000))
        : 0;

      const byServiceMap = new Map<string, OnSiteDurationSample[]>();
      for (const s of techSamples) {
        const key = s.serviceType || "GERAL";
        const list = byServiceMap.get(key) ?? [];
        list.push(s);
        byServiceMap.set(key, list);
      }

      const byService = [...byServiceMap.entries()]
        .map(([serviceType, serviceSamples]) => {
          const svcSummary = summarizeOnSiteDurations(serviceSamples);
          const svcAvgMinutes = svcSummary.avgDurationMs
            ? Math.max(1, Math.round(svcSummary.avgDurationMs / 60_000))
            : 0;
          const cfg = getServiceTypeColor(serviceType);
          return {
            serviceType,
            serviceLabel: cfg.label,
            sampleCount: svcSummary.sampleCount,
            avgMinutes: svcAvgMinutes,
            formattedAvg: svcSummary.formattedAvg ?? "—",
          };
        })
        .sort((a, b) => b.sampleCount - a.sampleCount);

      return {
        name,
        sampleCount: summary.sampleCount,
        avgMinutes,
        formattedAvg: summary.formattedAvg ?? "—",
        byService,
      };
    })
    .sort((a, b) => b.sampleCount - a.sampleCount);
}
