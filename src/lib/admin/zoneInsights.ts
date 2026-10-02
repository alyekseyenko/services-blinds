import { isNeedsSchedulingStage } from "@/lib/crm/contract";
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



export function countUnscheduledWithoutGps(opportunities: Opportunity[]): number {

  return opportunities.filter(

    (opp) =>

      isNeedsSchedulingStage(opp.stage) &&

      !opp.hasScheduledTask &&

      !opp.coordinates

  ).length;

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


