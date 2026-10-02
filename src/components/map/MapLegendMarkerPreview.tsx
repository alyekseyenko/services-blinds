"use client";

import { useMemo } from "react";
import { buildServiceTypeMarkerSvg } from "@/lib/techniciansConfig";
import type { MarkerStatusBadge } from "@/lib/map/serviceMarkerArt";
import { MAP_PIN_ASPECT } from "@/lib/map/serviceMarkerArt";

interface MapLegendMarkerPreviewProps {
  typeKey: string;
  label: string;
  status?: MarkerStatusBadge;
  /** Pin render size in px (default 48). */
  size?: number;
}

export function MapLegendMarkerPreview({
  typeKey,
  label,
  status = null,
  size = 48,
}: MapLegendMarkerPreviewProps) {
  const src = useMemo(() => {
    const svg = buildServiceTypeMarkerSvg(typeKey, { size, status });
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, [typeKey, status, size]);

  const height = Math.round(size * MAP_PIN_ASPECT);
  const widthClass = size <= 36 ? "w-9" : "w-12";

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={height}
      className={`h-auto ${widthClass} shrink-0 drop-shadow-md`}
      aria-hidden
      title={label}
    />
  );
}
