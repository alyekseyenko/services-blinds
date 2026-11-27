import { deriveWorkflowMarkerKey, isTaskCompleted } from "@/lib/crm/contract";
import { parseAssistantIds } from "@/lib/visits/team";
import { canonicalTechnicianName } from "@/lib/technicianIdentity";
import {
  getServiceTypeColor,
  normalizeServiceTypeKey,
} from "@/lib/techniciansConfig";
import {
  computeOnSiteDurationMs,
  formatOnSiteDurationPt,
  parseVisitSiteTimes,
  type VisitSiteTimes,
} from "@/lib/visits/siteTimes";

/** @deprecated Limites removidos — mantido só para testes legados. */
export const ON_SITE_DURATION_MIN_MS = 0;
export const ON_SITE_DURATION_MAX_MS = Number.POSITIVE_INFINITY;
export const FAIR_ON_SITE_DURATION_MIN_SAMPLES = 5;
/** Home admin: média aritmética só com amostra mínima, para um outlier não mandar. */
export const AVG_ON_SITE_DURATION_MIN_SAMPLES = 3;
export const FAIR_ON_SITE_DURATION_SHRINK_PRIOR = 5;
export const FAIR_ON_SITE_DURATION_PERCENTILE = 0.8;

export const FAIR_ON_SITE_DURATION_HELP_PT =
  "Este tempo não é a média de todas as visitas. Para cada técnico olha-se o ponto em que 80% das visitas deste tipo já acabaram (referência Solo, com 1 técnico). Visitas em equipa têm referência à parte, quando há amostra suficiente; caso contrário usa-se a referência geral. Homens-hora multiplica o tempo em obra pelo número de técnicos na visita. Só entram visitas concluídas; o tempo soma cada ida ao local até ao fecho. Com menos de 5 visitas concluídas deste tipo no grupo (Solo ou Equipa), o tempo não aparece.";

export type OnSiteDurationSample = {
  durationMs: number;
  serviceType: string;
  technicianName?: string;
  /** Técnicos na visita (master + auxiliares); default 1. */
  teamSize?: number;
  /** durationMs × teamSize */
  manHoursMs?: number;
};

export type OnSiteDurationSummary = {
  sampleCount: number;
  avgDurationMs: number | null;
  formattedAvg: string | null;
};

export type FairServiceTypeDuration = {
  serviceType: string;
  serviceLabel: string;
  sampleCount: number;
  recommendedDurationMs: number;
  recommendedMinutes: number;
  formattedRecommended: string;
};

export type ServiceTypeDurationAverage = {
  serviceType: string;
  serviceLabel: string;
  sampleCount: number;
  avgMinutes: number;
  formattedAvg: string;
};

export type OpportunityForOnSiteSamples = {
  stage?: string | null;
  name?: string | null;
  taskTargets?: {
    edges?: Array<{
      node?: {
        task?: {
          status?: string | null;
          technicianName?: string | null;
          title?: string | null;
          equipaAuxiliarIds?: string | null;
          equipaAuxiliarNomes?: string | null;
          bodyV2?: { markdown?: string | null } | null;
        } | null;
      } | null;
    }> | null;
  } | null;
};

export function isValidOnSiteDurationMs(durationMs: number): boolean {
  return Number.isFinite(durationMs) && durationMs > 0;
}

export function percentile80(durationsMs: readonly number[]): number | null {
  if (durationsMs.length === 0) return null;
  const sorted = [...durationsMs].sort((a, b) => a - b);
  const index = Math.ceil(FAIR_ON_SITE_DURATION_PERCENTILE * sorted.length) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

export function shrinkTechnicianPercentile(
  sampleCount: number,
  technicianPercentileMs: number,
  fleetPercentileMs: number
): number {
  const n = sampleCount;
  return (
    (n * technicianPercentileMs + FAIR_ON_SITE_DURATION_SHRINK_PRIOR * fleetPercentileMs) /
    (n + FAIR_ON_SITE_DURATION_SHRINK_PRIOR)
  );
}

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
  if (durationMs === null || !isValidOnSiteDurationMs(durationMs)) return null;
  return {
    durationMs,
    serviceType,
    technicianName: canonicalTechnicianName(technicianName) || undefined,
  };
}

export function collectOnSiteDurationSamplesFromOpportunities(
  opportunities: readonly OpportunityForOnSiteSamples[]
): OnSiteDurationSample[] {
  const samples: OnSiteDurationSample[] = [];
  for (const node of opportunities) {
    const edges = node.taskTargets?.edges ?? [];
    const tasks = edges
      .map((edge) => edge?.node?.task)
      .filter((task): task is NonNullable<typeof task> => Boolean(task));

    if (tasks.length === 0) continue;

    const hasCompleted = tasks.some((task) => isTaskCompleted(task.status));
    if (!hasCompleted) continue;

    let durationMs = 0;
    for (const task of tasks) {
      const partial = computeOnSiteDurationMs(parseVisitSiteTimes(task.bodyV2?.markdown));
      if (partial !== null) durationMs += partial;
    }
    if (!isValidOnSiteDurationMs(durationMs)) continue;

    const completedTasks = tasks.filter((task) => isTaskCompleted(task.status));
    const repTask = completedTasks[0] ?? tasks[tasks.length - 1];
    const serviceType = deriveWorkflowMarkerKey(node.stage, repTask?.title ?? node.name);
    const size = 1 + parseAssistantIds(repTask?.equipaAuxiliarIds).length;
    samples.push({
      durationMs,
      serviceType,
      technicianName: canonicalTechnicianName(repTask?.technicianName) || undefined,
      teamSize: size,
      manHoursMs: durationMs * size,
    });
  }
  return samples;
}

export function buildAverageServiceTypeDurations(
  samples: readonly OnSiteDurationSample[]
): ServiceTypeDurationAverage[] {
  const byType = new Map<string, OnSiteDurationSample[]>();
  for (const sample of samples) {
    if (!isValidOnSiteDurationMs(sample.durationMs)) continue;
    const key = normalizeServiceTypeKey(sample.serviceType || "GERAL");
    const list = byType.get(key) ?? [];
    list.push({ ...sample, serviceType: key });
    byType.set(key, list);
  }

  const results: ServiceTypeDurationAverage[] = [];
  for (const [serviceType, typeSamples] of byType) {
    if (typeSamples.length < AVG_ON_SITE_DURATION_MIN_SAMPLES) continue;
    const summary = summarizeOnSiteDurations(typeSamples);
    if (!summary.avgDurationMs || !summary.formattedAvg) continue;
    const cfg = getServiceTypeColor(serviceType);
    results.push({
      serviceType,
      serviceLabel: cfg.label,
      sampleCount: summary.sampleCount,
      avgMinutes: Math.max(1, Math.round(summary.avgDurationMs / 60_000)),
      formattedAvg: summary.formattedAvg,
    });
  }
  return results.sort((a, b) => b.sampleCount - a.sampleCount || a.serviceLabel.localeCompare(b.serviceLabel, "pt-PT"));
}

export function buildFairServiceTypeDurations(
  samples: readonly OnSiteDurationSample[]
): FairServiceTypeDuration[] {
  const byType = new Map<string, OnSiteDurationSample[]>();
  for (const sample of samples) {
    if (!isValidOnSiteDurationMs(sample.durationMs)) continue;
    const key = normalizeServiceTypeKey(sample.serviceType || "GERAL");
    const list = byType.get(key) ?? [];
    list.push({ ...sample, serviceType: key });
    byType.set(key, list);
  }

  const results: FairServiceTypeDuration[] = [];

  for (const [serviceType, typeSamples] of byType) {
    if (typeSamples.length < FAIR_ON_SITE_DURATION_MIN_SAMPLES) continue;

    const fleetPercentile = percentile80(typeSamples.map((s) => s.durationMs));
    if (fleetPercentile === null) continue;

    const byTechnician = new Map<string, number[]>();
    for (const sample of typeSamples) {
      const name = sample.technicianName?.trim();
      if (!name) continue;
      const list = byTechnician.get(name) ?? [];
      list.push(sample.durationMs);
      byTechnician.set(name, list);
    }

    const shrunkValues: number[] = [];
    for (const durations of byTechnician.values()) {
      const techPercentile = percentile80(durations);
      if (techPercentile === null) continue;
      shrunkValues.push(shrinkTechnicianPercentile(durations.length, techPercentile, fleetPercentile));
    }

    const recommendedMs =
      shrunkValues.length > 0 ? median(shrunkValues) ?? fleetPercentile : fleetPercentile;
    const cfg = getServiceTypeColor(serviceType);

    results.push({
      serviceType,
      serviceLabel: cfg.label,
      sampleCount: typeSamples.length,
      recommendedDurationMs: recommendedMs,
      recommendedMinutes: Math.max(1, Math.round(recommendedMs / 60_000)),
      formattedRecommended: formatOnSiteDurationPt(recommendedMs),
    });
  }

  return results.sort((a, b) => b.sampleCount - a.sampleCount);
}

export function filterOnSiteSamplesByTeamMode(
  samples: readonly OnSiteDurationSample[],
  mode: "solo" | "equipa"
): OnSiteDurationSample[] {
  return samples.filter((sample) => {
    const size = sample.teamSize ?? 1;
    return mode === "solo" ? size <= 1 : size > 1;
  });
}

export function buildFairServiceTypeDurationsWithFallback(
  samples: readonly OnSiteDurationSample[],
  mode: "solo" | "equipa"
): FairServiceTypeDuration[] {
  const scoped = buildFairServiceTypeDurations(filterOnSiteSamplesByTeamMode(samples, mode));
  if (scoped.length > 0) return scoped;
  return buildFairServiceTypeDurations(samples);
}

export function summarizeManHours(samples: readonly OnSiteDurationSample[]): {
  sampleCount: number;
  totalManHoursMs: number;
  formattedTotal: string | null;
} {
  let total = 0;
  let count = 0;
  for (const sample of samples) {
    const man = sample.manHoursMs ?? sample.durationMs * (sample.teamSize ?? 1);
    if (!isValidOnSiteDurationMs(sample.durationMs)) continue;
    total += man;
    count += 1;
  }
  if (count === 0) return { sampleCount: 0, totalManHoursMs: 0, formattedTotal: null };
  return {
    sampleCount: count,
    totalManHoursMs: total,
    formattedTotal: formatOnSiteDurationPt(total),
  };
}

export function buildTechnicianOnSiteDurationRowsSolo(
  samples: OnSiteDurationSample[]
): TechnicianOnSiteDurationRow[] {
  return buildTechnicianOnSiteDurationRows(filterOnSiteSamplesByTeamMode(samples, "solo"));
}

export function buildTeamOnSiteDurationSummary(samples: OnSiteDurationSample[]): OnSiteDurationSummary {
  return summarizeOnSiteDurations(filterOnSiteSamplesByTeamMode(samples, "equipa"));
}

export function lookupFairServiceTypeDurationForAllocation(
  fairSolo: readonly FairServiceTypeDuration[],
  fairEquipa: readonly FairServiceTypeDuration[],
  fairAll: readonly FairServiceTypeDuration[],
  serviceType: string | null | undefined,
  isTeam: boolean
): FairServiceTypeDuration | undefined {
  const preferred = isTeam ? fairEquipa : fairSolo;
  const hit =
    lookupFairServiceTypeDuration(preferred, serviceType) ??
    lookupFairServiceTypeDuration(fairAll, serviceType);
  return hit;
}

export function lookupFairServiceTypeDuration(
  fairDurations: readonly FairServiceTypeDuration[],
  serviceType: string | null | undefined
): FairServiceTypeDuration | undefined {
  if (!serviceType?.trim()) return undefined;
  const key = normalizeServiceTypeKey(serviceType);
  return fairDurations.find((row) => row.serviceType === key);
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
