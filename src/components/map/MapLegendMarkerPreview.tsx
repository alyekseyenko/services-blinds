"use client";

import { useMemo } from "react";
import { buildServiceTypeMarkerSvg } from "@/lib/techniciansConfig";
import type { MarkerStatusBadge } from "@/lib/map/serviceMarkerArt";
import { MAP_PIN_ASPECT } from "@/lib/map/serviceMarkerArt";

interface MapLegendMarkerPreviewProps {
  typeKey: string;
  label: string;
  status?: MarkerStatusBadge;
}

export function MapLegendMarkerPreview({
  typeKey,
  label,
  status = null,
}: MapLegendMarkerPreviewProps) {
  const src = useMemo(() => {
    const svg = buildServiceTypeMarkerSvg(typeKey, { size: 48, status });
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, [typeKey, status]);

  const height = Math.round(48 * MAP_PIN_ASPECT);

  return (
    <img
      src={src}
      alt=""
      width={48}
      height={height}
      className="h-auto w-12 shrink-0 drop-shadow-md"
      aria-hidden
      title={label}
    />
  );
}
