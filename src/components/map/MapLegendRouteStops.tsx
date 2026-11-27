"use client";

import { useMemo } from "react";
import { buildRouteStopTeardropSvg, MAP_PIN_ASPECT } from "@/lib/map/serviceMarkerArt";
import { routeStopMarkerArt } from "@/lib/map/routeStopPin";
import {
  MAP_LEGEND_ROUTE_DETAIL,
  MAP_LEGEND_ROUTE_ITEMS,
  MAP_LEGEND_ROUTE_TITLE,
} from "@/lib/map/mapLegendCopy";

function RouteStopPreview({
  kind,
  isNext,
  exampleIndex,
  size,
  label,
}: {
  kind: (typeof MAP_LEGEND_ROUTE_ITEMS)[number]["kind"];
  isNext: boolean;
  exampleIndex: number;
  size: number;
  label: string;
}) {
  const src = useMemo(() => {
    const art = routeStopMarkerArt(kind, exampleIndex, isNext ? exampleIndex : -1);
    const svg = buildRouteStopTeardropSvg({
      pinColor: art.pinColor,
      isLate: art.isLate,
      isNext: art.isNext,
      width: size,
      symbolText: art.symbolText,
    });
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, [kind, isNext, exampleIndex, size]);

  const height = Math.round(size * MAP_PIN_ASPECT);

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={height}
      className="h-auto w-12 shrink-0 drop-shadow-md"
      aria-hidden
      title={label}
    />
  );
}

export function MapLegendRouteStops({ previewSize }: { previewSize: number }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
        {MAP_LEGEND_ROUTE_TITLE}
      </p>
      <p className="mb-2 text-xs font-semibold leading-snug text-muted-foreground">
        {MAP_LEGEND_ROUTE_DETAIL}
      </p>
      <ul className="space-y-2">
        {MAP_LEGEND_ROUTE_ITEMS.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5">
            <RouteStopPreview
              kind={item.kind}
              isNext={item.isNext}
              exampleIndex={item.exampleIndex}
              size={previewSize}
              label={item.label}
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs font-black text-foreground">{item.label}</p>
              <p className="text-xs font-semibold leading-snug text-muted-foreground">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
