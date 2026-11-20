import "server-only";
import { fetchAdminOpportunities } from "@/lib/crm/opportunities";

export type MeasurementPipelineServiceHit = {
  opportunityId: string;
  title: string;
  client: string;
  nsi?: string;
  address: string;
  stage: string;
  taskId: string | null;
};

function matchesPipelineSearch(hit: MeasurementPipelineServiceHit, query: string): boolean {
  const haystack = [
    hit.title,
    hit.client,
    hit.nsi,
    hit.address,
    hit.stage,
    hit.opportunityId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return true;
  return terms.every((term) => haystack.includes(term));
}

export async function searchPipelineServicesForMeasurements(
  query: string,
  limit = 20
): Promise<MeasurementPipelineServiceHit[]> {
  const opportunities = await fetchAdminOpportunities();
  const mapped: MeasurementPipelineServiceHit[] = opportunities.map((opp) => ({
    opportunityId: opp.twentyId,
    title: opp.title,
    client: opp.client,
    nsi: opp.nsi,
    address: opp.address,
    stage: opp.stage,
    taskId: opp.taskId?.trim() ? opp.taskId : null,
  }));

  const filtered = mapped.filter((row) => matchesPipelineSearch(row, query));
  const ordered = query.trim() ? filtered : mapped;
  return ordered.slice(0, limit);
}