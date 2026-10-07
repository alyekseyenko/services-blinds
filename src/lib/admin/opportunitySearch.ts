import type { Opportunity } from "@/types/admin";

function opportunityNsiText(opp: Opportunity): string {
  if (opp.nsi == null || opp.nsi === "") return "";
  return String(opp.nsi).trim();
}

export function normalizeAdminSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function searchableFields(opp: Opportunity): string[] {
  const fields = [
    opp.client,
    opp.title,
    opp.address,
    opp.addressCity,
    opp.technician,
    opp.nsi,
    opp.twentyId,
    opp.taskId,
    opp.pointOfContactEmail,
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

/** Pontuação: cliente e título do serviço primeiro; NSI só como fallback. */
export function scoreOpportunitySearchMatch(opp: Opportunity, query: string): number | null {
  const q = normalizeAdminSearchQuery(query);
  if (!q) return null;

  const client = String(opp.client ?? "").toLowerCase();
  const title = String(opp.title ?? "").toLowerCase();
  const address = String(opp.address ?? "").toLowerCase();
  const city = String(opp.addressCity ?? "").toLowerCase();
  const technician = String(opp.technician ?? "").toLowerCase();
  const nsi = opportunityNsiText(opp).toLowerCase();

  let score = 0;

  if (client === q) score = Math.max(score, 100);
  if (client.startsWith(q)) score = Math.max(score, 88);
  if (title === q) score = Math.max(score, 82);
  if (title.startsWith(q)) score = Math.max(score, 75);
  if (client.includes(q)) score = Math.max(score, 58);
  if (title.includes(q)) score = Math.max(score, 52);
  if (address.includes(q) || city.includes(q)) score = Math.max(score, 42);
  if (technician.startsWith(q) || technician.includes(q)) score = Math.max(score, 36);
  if (nsi && nsi === q) score = Math.max(score, 28);
  if (nsi.startsWith(q)) score = Math.max(score, 22);
  if (score === 0 && opportunityMatchesSearch(opp, q)) score = 10;

  return score > 0 ? score : null;
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
      const score = scoreOpportunitySearchMatch(opp, q);
      if (score === null) return null;
      return { opp, score };
    })
    .filter((x): x is { opp: Opportunity; score: number } => x !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const clientA = String(a.opp.client ?? a.opp.title ?? "").trim();
      const clientB = String(b.opp.client ?? b.opp.title ?? "").trim();
      return clientA.localeCompare(clientB, "pt-PT");
    });

  return scored.slice(0, limit).map((x) => x.opp);
}

/** Pick map tab so a search result pin is likely visible. */
export function suggestMapTabForOpportunity(opp: Opportunity): "unscheduled" | "scheduled" {
  if (opp.hasScheduledTask) return "scheduled";
  return "unscheduled";
}
