import "server-only";

import { fetchOpportunityNodesForOnSiteBenchmarks } from "@/lib/ceo/metrics";
import { cacheGet, cacheSet } from "@/lib/crmCache";
import {
  buildAverageServiceTypeDurations,
  buildFairServiceTypeDurations,
  collectOnSiteDurationSamplesFromOpportunities,
  type FairServiceTypeDuration,
  type ServiceTypeDurationAverage,
} from "@/lib/visits/onSiteDurationStats";

const CACHE_KEY = "on-site-benchmarks-v2";
const CACHE_TTL_SEC = 300;

export type OnSiteDurationBenchmarks = {
  fair: FairServiceTypeDuration[];
  averages: ServiceTypeDurationAverage[];
};

export async function fetchOnSiteDurationBenchmarks(): Promise<OnSiteDurationBenchmarks> {
  const cached = await cacheGet<OnSiteDurationBenchmarks>(CACHE_KEY);
  if (cached) return cached;

  const nodes = await fetchOpportunityNodesForOnSiteBenchmarks();
  const samples = collectOnSiteDurationSamplesFromOpportunities(nodes);
  const payload: OnSiteDurationBenchmarks = {
    fair: buildFairServiceTypeDurations(samples),
    averages: buildAverageServiceTypeDurations(samples),
  };
  await cacheSet(CACHE_KEY, payload, CACHE_TTL_SEC);
  return payload;
}

export async function fetchFairOnSiteDurationBenchmarks(): Promise<FairServiceTypeDuration[]> {
  return (await fetchOnSiteDurationBenchmarks()).fair;
}
