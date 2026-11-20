import { isNeedsSchedulingStage } from "@/lib/crm/contract";
import { hasUsableServiceAddress, isMissingGps } from "@/lib/geocodeQueue";
import { matchesServiceTypeFilters } from "@/lib/admin/mapFilterConfig";

import { euclideanKm, resolveCityKeyFromOpportunity } from "@/lib/admin/geo";

import type { MapCategoryFilter, Opportunity, ZoneInsight } from "@/types/admin";



interface ZoneGroup {

  name: string;

  key: string;

  count: number;

  coords: [number, number] | null;

  services: Opportunity[];

}



export interface ZoneInsightsOptions {

  fuelConsumption?: number;

  fuelPrice?: number;

  serviceTypeFilters?: readonly MapCategoryFilter[];

}



function matchesCategoryFilter(
  opp: Opportunity,
  serviceTypeFilters: readonly MapCategoryFilter[]
): boolean {
  return matchesServiceTypeFilters(opp, serviceTypeFilters);
}



function priorityToImpact(priority: ZoneInsight["priority"]): ZoneInsight["impact"] {

  switch (priority) {

    case "Critical":

      return "Critical";

    case "High":

      return "High";

    case "Medium":

      return "Medium";

    default:

      return "Low";

  }

}



export type UnscheduledWithoutGps = {
  twentyId: string;
  title: string;
  client: string;
  serviceNumber?: string;
  nsi?: string;
  address: string;
};

/** Twenty NUMBER fields (and old IndexedDB rows) are not always strings. */
function crmText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function usableIdentity(value: unknown, placeholders: readonly string[] = []): string {
  const text = crmText(value);
  if (!text) return "";
  if (placeholders.some((item) => item.localeCompare(text, "pt", { sensitivity: "accent" }) === 0)) {
    return "";
  }
  return text;
}

export function listUnscheduledWithoutGps(
  opportunities: Opportunity[]
): UnscheduledWithoutGps[] {
  return opportunities
    .filter(
      (opp) =>
        isNeedsSchedulingStage(opp.stage) &&
        !opp.hasScheduledTask &&
        isMissingGps(opp.coordinates)
    )
    .map((opp) => ({
      twentyId: opp.twentyId,
      title: crmText(opp.title),
      client: usableIdentity(opp.client, ["Cliente"]),
      serviceNumber: usableIdentity(opp.serviceNumber) || undefined,
      nsi: usableIdentity(opp.nsi, ["N/A"]) || undefined,
      address: hasUsableServiceAddress(opp.address) ? opp.address : "Sem morada no CRM",
    }));
}

export function countUnscheduledWithoutGps(opportunities: Opportunity[]): number {
  return listUnscheduledWithoutGps(opportunities).length;
}



export function computeZoneInsights(

  opportunities: Opportunity[],

  hqCoordinates: [number, number],

  options: ZoneInsightsOptions = {}

): ZoneInsight[] {

  const {

    fuelConsumption = 7.0,

    fuelPrice = 1.9,

    serviceTypeFilters = [],

  } = options;



  if (opportunities.length === 0) return [];



  const unscheduled = opportunities.filter(

    (opp) =>

      isNeedsSchedulingStage(opp.stage) &&

      !opp.hasScheduledTask &&

      matchesCategoryFilter(opp, serviceTypeFilters)

  );



  const groups = unscheduled.reduce<Record<string, ZoneGroup>>((acc, opp) => {

    const { key, display } = resolveCityKeyFromOpportunity(opp);



    if (!acc[key]) {

      acc[key] = { name: display, key, count: 0, coords: opp.coordinates || null, services: [] };

    }

    acc[key].count++;

    acc[key].services.push(opp);

    if (opp.coordinates && (!acc[key].coords || acc[key].count === 1)) {

      acc[key].coords = opp.coordinates;

    }

    return acc;

  }, {});



  return Object.values(groups)

    .map((group) => {

      if (!group.coords) return null;



      const dist = euclideanKm(group.coords, hqCoordinates);

      const fuelCost = ((dist * 2) / 100) * fuelConsumption * fuelPrice;

      const tollEst = dist > 50 ? 15 : 0;

      const totalLogistics = fuelCost + tollEst;

      const score = group.count * 40 - dist / 1.5;



      let priority: ZoneInsight["priority"] = "Low";

      if (score > 120 || group.count >= 5) priority = "Critical";

      else if (score > 70) priority = "High";

      else if (score > 30) priority = "Medium";



      return {

        name: group.name,

        key: group.key,

        count: group.count,

        distance: Math.round(dist),

        logisticsCost: Math.round(totalLogistics),

        priority,

        impact: priorityToImpact(priority),

        score,

      };

    })

    .filter((insight): insight is ZoneInsight => insight !== null && insight.count >= 1)

    .sort((a, b) => b.score - a.score)

    .slice(0, 6);

}


