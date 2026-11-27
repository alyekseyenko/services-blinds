import {
  buildFairServiceTypeDurationsWithFallback,
  buildTechnicianOnSiteDurationRowsSolo,
  buildTeamOnSiteDurationSummary,
  collectOnSiteDurationSamplesFromOpportunities,
  summarizeManHours,
  summarizeOnSiteDurations,
} from "@/lib/visitOnSiteDurationStats";

type OppNode = Record<string, unknown>;

export function computeCeoOnSiteDuration(filteredOpps: OppNode[]) {
  const onSiteSamples = collectOnSiteDurationSamplesFromOpportunities(filteredOpps);
  const fairServiceTypeDurations = buildFairServiceTypeDurationsWithFallback(onSiteSamples, "solo");
  const fairTeamServiceTypeDurations = buildFairServiceTypeDurationsWithFallback(
    onSiteSamples,
    "equipa"
  );
  const fleetOnSiteSummary = summarizeOnSiteDurations(onSiteSamples);
  const teamSummary = buildTeamOnSiteDurationSummary(onSiteSamples);
  const manHours = summarizeManHours(onSiteSamples);
  const technicianOnSiteDurations = buildTechnicianOnSiteDurationRowsSolo(onSiteSamples);
  const onSiteDuration = {
    sampleCount: fleetOnSiteSummary.sampleCount,
    avgMinutes: fleetOnSiteSummary.avgDurationMs
      ? Math.max(1, Math.round(fleetOnSiteSummary.avgDurationMs / 60_000))
      : 0,
    formattedAvg: fleetOnSiteSummary.formattedAvg ?? "—",
    formattedManHours: manHours.formattedTotal,
    teamVisitSampleCount: teamSummary.sampleCount,
    teamVisitFormattedAvg: teamSummary.formattedAvg,
  };
  return {
    onSiteDuration,
    fairServiceTypeDurations,
    fairTeamServiceTypeDurations,
    technicianOnSiteDurations,
  };
}