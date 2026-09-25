import { isNeedsSchedulingStage } from "@/lib/crm/contract";
import { citiesMatch, euclideanKm, resolveCityKeyFromOpportunity } from "@/lib/admin/geo";
import type { Opportunity, RouteStop } from "@/types/admin";

export interface OptimizedRouteStop extends RouteStop {
  distanceFromLast?: string;
  isReturn?: boolean;
  stage?: string;
}

export interface RouteOptimizationResult {
  optimizedRoute: OptimizedRouteStop[];
  savingRatio: number;
}

function nearestNeighborOrder(
  stops: RouteStop[],
  hqCoordinates: [number, number]
): { ordered: OptimizedRouteStop[]; optEuclidean: number; unoptEuclidean: number } {
  let unoptEuclidean = 0;
  let prevPos = hqCoordinates;
  stops.forEach((p) => {
    if (p.coordinates) {
      unoptEuclidean += Math.sqrt(
        Math.pow(p.coordinates[0] - prevPos[0], 2) + Math.pow(p.coordinates[1] - prevPos[1], 2)
      );
      prevPos = p.coordinates;
    }
  });
  unoptEuclidean += Math.sqrt(
    Math.pow(hqCoordinates[0] - prevPos[0], 2) + Math.pow(hqCoordinates[1] - prevPos[1], 2)
  );

  let currentPos = hqCoordinates;
  const unvisited = [...stops];
  const result: OptimizedRouteStop[] = [];
  let optEuclidean = 0;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const coords = unvisited[i].coordinates;
      if (coords) {
        const dist = Math.sqrt(
          Math.pow(coords[0] - currentPos[0], 2) + Math.pow(coords[1] - currentPos[1], 2)
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }
    }
    optEuclidean += minDistance;
    const nextPoint = unvisited[nearestIdx];
    result.push({
      ...nextPoint,
      distanceFromLast: (minDistance * 111).toFixed(1),
    });
    if (nextPoint.coordinates) {
      currentPos = nextPoint.coordinates;
    }
    unvisited.splice(nearestIdx, 1);
  }

  const distToHQ = Math.sqrt(
    Math.pow(hqCoordinates[0] - currentPos[0], 2) + Math.pow(hqCoordinates[1] - currentPos[1], 2)
  );
  optEuclidean += distToHQ;

  const returnStop: OptimizedRouteStop = {
    id: "return-to-hq",
    twentyId: "return-to-hq",
    title: "Regresso à Sede",
    client: "HQ",
    address: "",
    coordinates: hqCoordinates,
    distanceFromLast: (distToHQ * 111).toFixed(1),
    isReturn: true,
  };

  return {
    ordered: [...result, returnStop],
    optEuclidean,
    unoptEuclidean,
  };
}

export function calculateOptimizedRoute(
  selectedStops: RouteStop[],
  hqCoordinates: [number, number]
): RouteOptimizationResult | null {
  if (selectedStops.length === 0) return null;

  const { ordered, optEuclidean, unoptEuclidean } = nearestNeighborOrder(
    selectedStops,
    hqCoordinates
  );
  const savingRatio = optEuclidean > 0 ? unoptEuclidean / optEuclidean : 1;

  return { optimizedRoute: ordered, savingRatio };
}

export function selectRouteStopsForZone(
  opportunities: Opportunity[],
  zoneName: string,
  hqCoordinates: [number, number],
  maxStops = 5
): RouteStop[] {
  const zoneOpps = opportunities.filter((opp) => {
    const { display } = resolveCityKeyFromOpportunity(opp);
    return (
      citiesMatch(display, zoneName) &&
      isNeedsSchedulingStage(opp.stage) &&
      !opp.hasScheduledTask &&
      opp.coordinates
    );
  });

  const remaining = [...zoneOpps] as RouteStop[];
  const selection: RouteStop[] = [];
  let currentPos = hqCoordinates;

  while (selection.length < maxStops && remaining.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const coords = remaining[i].coordinates;
      if (coords) {
        const d = Math.sqrt(
          Math.pow(coords[0] - currentPos[0], 2) + Math.pow(coords[1] - currentPos[1], 2)
        );
        if (d < minDist) {
          minDist = d;
          nearestIdx = i;
        }
      }
    }
    const nextOne = remaining[nearestIdx];
    selection.push(nextOne);
    if (nextOne.coordinates) {
      currentPos = nextOne.coordinates;
    }
    remaining.splice(nearestIdx, 1);
  }

  return selection;
}

export function selectRouteStopsNearLocation(
  opportunities: Opportunity[],
  searchCoordinates: [number, number],
  radiusKm = 40,
  maxStops = 10
): RouteStop[] {
  const unscheduled = opportunities.filter(
    (o) => isNeedsSchedulingStage(o.stage) && !o.scheduledAt && o.coordinates
  );

  const inZone = unscheduled
    .map((o) => {
      const coords = o.coordinates || [0, 0];
      return {
        ...(o as RouteStop),
        distToSearch: euclideanKm(coords, searchCoordinates),
      };
    })
    .filter((o) => o.distToSearch <= radiusKm);

  return inZone
    .sort((a, b) => a.distToSearch - b.distToSearch)
    .slice(0, maxStops)
    .map(({ distToSearch: _dist, ...stop }) => stop);
}
