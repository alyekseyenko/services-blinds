import { isNeedsSchedulingStage } from "@/lib/crm/contract";
import { euclideanKm } from "@/lib/admin/geo";
import type { Opportunity, ZoneInsight } from "@/types/admin";

interface ZoneGroup {
  name: string;
  count: number;
  coords: [number, number] | null;
  services: Opportunity[];
}

function titleCaseCity(raw: string): string {
  return raw
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function resolveCityKey(opp: Opportunity): { key: string; display: string } {
  let rawLocation = opp.addressCity || "";
  if (!rawLocation && opp.address) {
    const parts = opp.address.split(",");
    if (parts.length > 1) {
      rawLocation = parts[parts.length - 2]?.trim() || parts[1]?.trim() || "";
    }
  }

  const trimmed = rawLocation.trim() || "Outras Zonas";
  const key = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return { key, display: titleCaseCity(trimmed) };
}

export function computeZoneInsights(
  opportunities: Opportunity[],
  hqCoordinates: [number, number],
  fuelConsumption = 7.0,
  fuelPrice = 1.9
): ZoneInsight[] {
  if (opportunities.length === 0) return [];

  const unscheduled = opportunities.filter(
    (o) => isNeedsSchedulingStage(o.stage) && !o.hasScheduledTask
  );

  const groups = unscheduled.reduce<Record<string, ZoneGroup>>((acc, opp) => {
    const { key, display } = resolveCityKey(opp);

    if (!acc[key]) {
      acc[key] = { name: display, count: 0, coords: opp.coordinates || null, services: [] };
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
      const fuelCost = (dist * 2 / 100) * fuelConsumption * fuelPrice;
      const tollEst = dist > 50 ? 15 : 0;
      const totalLogistics = fuelCost + tollEst;
      const score = group.count * 40 - dist / 1.5;

      let priority = "Baixa";
      if (score > 120 || group.count >= 5) priority = "Crítica";
      else if (score > 70) priority = "Alta";
      else if (score > 30) priority = "Média";

      return {
        name: group.name,
        count: group.count,
        distance: Math.round(dist),
        logisticsCost: Math.round(totalLogistics),
        priority,
        score,
      };
    })
    .filter((i): i is ZoneInsight => i !== null && i.count >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}
