import type { OptimizedRouteStop } from "@/lib/admin/routeOptimization";
import type { RouteStop } from "@/types/admin";

export function formatDurationMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export type RouteStopListRow = {
  key: string;
  kind: "hq-start" | "stop" | "hq-end";
  stop?: RouteStop | OptimizedRouteStop;
  index?: number;
};

export function buildRouteStopRows(
  displayStops: (RouteStop | OptimizedRouteStop)[],
  optimizedRoute: OptimizedRouteStop[] | null,
  stopCount: number
): RouteStopListRow[] {
  const rows: RouteStopListRow[] = [];
  if (stopCount === 0) return rows;
  rows.push({ key: "hq-start", kind: "hq-start" });
  let stopIndex = 0;
  for (const item of displayStops) {
    if (item.isReturn) {
      rows.push({ key: "hq-end", kind: "hq-end", stop: item });
      continue;
    }
    stopIndex += 1;
    rows.push({ key: item.id, kind: "stop", stop: item, index: stopIndex });
  }
  if (!optimizedRoute) {
    rows.push({ key: "hq-end-pending", kind: "hq-end" });
  }
  return rows;
}