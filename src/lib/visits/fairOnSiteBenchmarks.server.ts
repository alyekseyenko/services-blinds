import "server-only";

import { fetchOpportunityNodesForOnSiteBenchmarks } from "@/lib/ceo/metrics";
import { cacheGet, cacheSet } from "@/lib/crmCache";
import {
  buildFairServiceTypeDurations,
  collectOnSiteDurationSamplesFromOpportunities,
  type FairServiceTypeDuration,
} from "@/lib/visits/onSiteDurationStats";

const CACHE_KEY = "fair-on-site-benchmarks-v1";
const CACHE_TTL_SEC = 300;

export async function fetchFairOnSiteDurationBenchmarks(): Promise<FairServiceTypeDuration[]> {
  const cached = await cacheGet<FairServiceTypeDuration[]>(CACHE_KEY);
  if (cached) return cached;

  const nodes = await fetchOpportunityNodesForOnSiteBenchmarks();
  const samples = collectOnSiteDurationSamplesFromOpportunities(nodes);
  const fair = buildFairServiceTypeDurations(samples);
  await cacheSet(CACHE_KEY, fair, CACHE_TTL_SEC);
  return fair;
}
