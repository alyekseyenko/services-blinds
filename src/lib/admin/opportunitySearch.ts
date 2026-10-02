import type { Opportunity } from "@/types/admin";

export function normalizeAdminSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function searchableFields(opp: Opportunity): string[] {
  const fields = [
    opp.nsi,
    opp.client,
    opp.title,
    opp.address,
    opp.technician,
    opp.twentyId,
    opp.taskId,
    opp.pointOfContactEmail,
    opp.addressCity,
    typeof opp.serviceType === "string" ? opp.serviceType : opp.serviceType?.join(" "),
  ];
  return fields.filter(Boolean).map((v) => String(v).toLowerCase());
}

export function opportunityMatchesSearch(opp: Opportunity, query: string): boolean {
  const q = normalizeAdminSearchQuery(query);
  if (!q) return true;
  const compact = q.replace(/\s+/g, "");
  return searchableFields(opp).some((field) => {
    if (field.includes(q)) return true;
    if (compact.length >= 3 && field.replace(/\s+/g, "").includes(compact)) return true;
    return false;
  });
}

export function searchOpportunities(
  opportunities: Opportunity[],
  query: string,
  limit = 12
): Opportunity[] {
  const q = normalizeAdminSearchQuery(query);
  if (!q) return [];

  const scored = opportunities
    .map((opp) => {
      const nsi = (opp.nsi || "").toLowerCase();
      let score = 0;
      if (nsi && nsi === q) score += 100;
      else if (nsi.startsWith(q)) score += 50;
      else if ((opp.client || "").toLowerCase().startsWith(q)) score += 30;
      else if (opportunityMatchesSearch(opp, q)) score += 10;
      else return null;
      return { opp, score };
    })
    .filter((x): x is { opp: Opportunity; score: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.opp.client.localeCompare(b.opp.client, "pt-PT"));

  return scored.slice(0, limit).map((x) => x.opp);
}

/** Pick map tab so a search result pin is likely visible. */
export function suggestMapTabForOpportunity(opp: Opportunity): "unscheduled" | "scheduled" {
  if (opp.hasScheduledTask) return "scheduled";
  return "unscheduled";
}
