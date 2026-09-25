import { MAP_PIN_ASPECT } from "@/lib/map/serviceMarkerArt";

export type MarkerFocusState = "default" | "selected" | "highlighted";

export interface ServiceMarkerPixelSize {
  width: number;
  height: number;
}

/** Pixel size for service-type teardrop pins at a given zoom level. */
export function getServiceMarkerPixelSize(
  zoom: number,
  focus: MarkerFocusState = "default"
): ServiceMarkerPixelSize {
  let width: number;
  if (zoom <= 11) width = 44;
  else if (zoom <= 13) width = 52;
  else width = 60;

  if (focus === "selected" || focus === "highlighted") width += 10;
  const height = Math.round(width * MAP_PIN_ASPECT);
  return { width, height };
}

export function getTechnicianVanPixelSize(zoom: number, selected = false): number {
  const base = zoom <= 11 ? 30 : zoom <= 13 ? 34 : 36;
  return selected ? base + 4 : base;
}

export function getRouteStopPixelSize(zoom: number): number {
  return zoom <= 11 ? 40 : 46;
}

export function getHqLogoPixelSize(zoom: number): number {
  return zoom <= 11 ? 36 : 40;
}

export function getUserLocationScale(zoom: number, isTechnicianView: boolean): number {
  const base = isTechnicianView ? 8 : 7;
  return zoom >= 14 ? base + 1 : base;
}

/** Show time / name labels only when zoomed in enough. */
export function shouldShowDenseLabels(zoom: number): boolean {
  return zoom >= 14;
}

/** Coarse zoom steps for marker art — avoids rebuilding pins on every zoom tick. */
export function getMapZoomBucket(zoom: number): number {
  if (zoom <= 11) return 11;
  if (zoom <= 13) return 13;
  return 14;
}

export type MarkerRingState = "default" | "late" | "scheduled" | "completed" | "needsScheduling";
