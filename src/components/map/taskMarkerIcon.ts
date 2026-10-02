import {
  buildServiceTypeMarkerSvg,
  resolveServiceType,
} from "@/lib/techniciansConfig";
import {
  MAP_PIN_TIP_X,
  MAP_PIN_TIP_Y,
  MAP_PIN_VIEW_HEIGHT,
  MAP_PIN_VIEW_WIDTH,
} from "@/lib/map/serviceMarkerArt";
import { getServiceMarkerPixelSize } from "@/lib/map/markerScale";

export type TaskMarkerIconOptions = {
  isLate: boolean;
  isUnscheduled: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  alertColor: string | null;
  showTechnicianColors: boolean;
  techColor: string;
  zoom: number;
};

const iconCache = new Map<string, google.maps.Icon>();

function teardropAnchor(width: number, height: number) {
  return new window.google.maps.Point(
    (MAP_PIN_TIP_X / MAP_PIN_VIEW_WIDTH) * width,
    (MAP_PIN_TIP_Y / MAP_PIN_VIEW_HEIGHT) * height
  );
}

function markerIconCacheKey(taskId: string, options: TaskMarkerIconOptions): string {
  return [
    taskId,
    options.zoom,
    options.isLate,
    options.isUnscheduled,
    options.isHighlighted,
    options.isSelected,
    options.alertColor ?? "",
    options.showTechnicianColors,
    options.techColor,
  ].join("|");
}

export function buildTaskMarkerIcon(
  task: { id?: string; serviceType?: string | string[] | null; stage?: string | null; title?: string | null },
  options: TaskMarkerIconOptions
) {
  const cacheKey = markerIconCacheKey(task.id || "unknown", options);
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const serviceType = resolveServiceType(task) || "GERAL";

  const focus = options.isSelected
    ? "selected"
    : options.isHighlighted
      ? "highlighted"
      : "default";
  const { width, height } = getServiceMarkerPixelSize(options.zoom, focus);

  const status = options.isLate
    ? "late"
    : options.isUnscheduled
      ? "unscheduled"
      : null;

  const svg = buildServiceTypeMarkerSvg(serviceType, {
    status,
    isHighlighted: options.isHighlighted,
    isSelected: options.isSelected,
    alertColor: options.alertColor,
    size: width,
    technicianColor: options.showTechnicianColors ? options.techColor : null,
  });

  const icon: google.maps.Icon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(width, height),
    anchor: teardropAnchor(width, height),
  };

  iconCache.set(cacheKey, icon);
  if (iconCache.size > 400) {
    const firstKey = iconCache.keys().next().value;
    if (firstKey) iconCache.delete(firstKey);
  }

  return icon;
}
