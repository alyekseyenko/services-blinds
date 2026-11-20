"use client";

import { Marker } from "@react-google-maps/api";
import { buildTaskMarkerIcon } from "@/components/map/taskMarkerIcon";
import { buildTaskMarkerDescriptor } from "@/lib/map/taskMarkerDescriptor";
import { buildRouteStopTeardropSvg, MAP_PIN_VIEW_HEIGHT, MAP_PIN_VIEW_WIDTH } from "@/lib/map/serviceMarkerArt";
import { teardropAnchor, routeStopLabelOrigin } from "@/lib/map/mapPinAnchors";
import { itineraryStopKind } from "@/lib/map/technicianDayItinerary";
import {
  getRouteStopPixelSize,
  getTechnicianVanPixelSize,
  shouldShowDenseLabels,
} from "@/lib/map/markerScale";

type TechnicianLocation = {
  technicianId: string;
  technicianName: string;
  lat: number;
  lng: number;
  lastUpdate: string;
};

export function MapEntityMarkers(props: {
  techniciansLocations: TechnicianLocation[];
  renderNow: number;
  mapZoomBucket: number;
  selectedTechMarker: { technicianId: string } | null;
  onTechnicianClick: (tech: TechnicianLocation) => void;
  numberedStops: any[];
  nextStopIndex: number;
  onStopClick: (stop: any) => void;
  useTaskClustering: boolean;
  tasks: any[];
  highlightedIds: string[];
  selectedMarker: any | null;
  showTechnicianColors: boolean;
  useMarkerPopup: boolean;
  onTaskMarkerClick: (task: any) => void;
}) {
  const {
    techniciansLocations,
    renderNow,
    mapZoomBucket,
    selectedTechMarker,
    onTechnicianClick,
    numberedStops,
    nextStopIndex,
    onStopClick,
    useTaskClustering,
    tasks,
    highlightedIds,
    selectedMarker,
    showTechnicianColors,
    useMarkerPopup,
    onTaskMarkerClick,
  } = props;

  return (
    <>
      {techniciansLocations.map((tech) => {
        const updateAgeMinutes = Math.round((renderNow - new Date(tech.lastUpdate).getTime()) / (60 * 1000));
        const timeLabel = updateAgeMinutes <= 1 ? "Agora mesmo" : `Há ${updateAgeMinutes} min`;
        const isSelectedTech = selectedTechMarker?.technicianId === tech.technicianId;
        const vanSize = getTechnicianVanPixelSize(mapZoomBucket, isSelectedTech);
        const showTechLabel = shouldShowDenseLabels(mapZoomBucket) || isSelectedTech;

        const vanSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vanSize}" height="${vanSize}" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="#090d16" stroke="#84cc16" stroke-width="3"/>
            <circle cx="20" cy="20" r="13" fill="#0284c7" fill-opacity="0.25"/>
            <path d="M11 23h18l-2.5-7h-13z" fill="#84cc16"/>
            <circle cx="15" cy="24" r="2.2" fill="#ffffff"/>
            <circle cx="25" cy="24" r="2.2" fill="#ffffff"/>
            <rect x="17" y="18" width="4" height="2.5" fill="#090d16"/>
          </svg>`;

        return (
          <Marker
            key={`tech-${tech.technicianId}`}
            position={{ lat: tech.lat, lng: tech.lng }}
            onClick={() => onTechnicianClick(tech)}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(vanSvg)}`,
              scaledSize: new window.google.maps.Size(vanSize, vanSize),
              anchor: new window.google.maps.Point(vanSize / 2, vanSize / 2),
            }}
            label={
              showTechLabel
                ? {
                    text: `🚗 ${tech.technicianName || "Técnico"}`,
                    className:
                      "bg-ink text-neon text-xs font-black px-2.5 py-1 rounded-full border border-border shadow-xl font-sans whitespace-nowrap",
                    color: "#84cc16",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }
                : undefined
            }
            title={`Técnico: ${tech.technicianName} (${timeLabel})`}
          />
        );
      })}

      {numberedStops.map((stop, idx) => {
        if (!stop.coordinates || !Array.isArray(stop.coordinates)) return null;

        const kind = itineraryStopKind(stop);
        const isDone = kind === "done";
        const isInc = kind === "incomplete";
        const isCanc = kind === "cancelled";
        const isLate = kind === "late";
        const isNext = idx === nextStopIndex;

        const pinColor = isDone
          ? "#10b981"
          : isInc
            ? "#f59e0b"
            : isCanc
              ? "#ef4444"
              : isNext
                ? "#2563eb"
                : "#0284c7";
        const symbolText = isDone ? "✓" : isCanc ? "✕" : isInc ? "!" : `${idx + 1}`;

        const stopWidth = getRouteStopPixelSize(mapZoomBucket);
        const stopHeight = Math.round(stopWidth * (MAP_PIN_VIEW_HEIGHT / MAP_PIN_VIEW_WIDTH));
        const stopSvg = buildRouteStopTeardropSvg({
          pinColor,
          isLate,
          isNext,
          width: stopWidth,
        });

        const statusTitle = isDone
          ? "Concluído"
          : isInc
            ? "Incompleto"
            : isCanc
              ? "Cancelado"
              : isLate
                ? "Atrasada"
                : isNext
                  ? "Próxima"
                  : "Pendente";

        return (
          <Marker
            key={`tech-stop-${stop.id || stop.twentyId || idx}`}
            position={{ lat: stop.coordinates[0], lng: stop.coordinates[1] }}
            zIndex={999}
            onClick={() => onStopClick(stop)}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(stopSvg)}`,
              scaledSize: new window.google.maps.Size(stopWidth, stopHeight),
              anchor: teardropAnchor(stopWidth, stopHeight),
              labelOrigin: routeStopLabelOrigin(stopWidth, stopHeight),
            }}
            label={{
              text: symbolText,
              color: pinColor,
              fontSize: "13px",
              fontWeight: "900",
            }}
            title={`${isNext ? "Próxima · " : ""}Paragem #${idx + 1} (${statusTitle}): ${stop.client || stop.title}`}
          />
        );
      })}

      {!useTaskClustering &&
        !selectedTechMarker &&
        tasks.map((task) => {
          const isNumberedStop = numberedStops.some(
            (stop) =>
              (stop.id && stop.id === task.id) ||
              (stop.twentyId && stop.twentyId === task.twentyId)
          );
          if (isNumberedStop) return null;
          if (!task.coordinates) return null;

          const desc = buildTaskMarkerDescriptor(task, {
            highlightedIds,
            selectedMarker,
            showTechnicianColors: !!showTechnicianColors,
          });

          return (
            <Marker
              key={task.id}
              position={{ lat: task.coordinates[0], lng: task.coordinates[1] }}
              onClick={() => onTaskMarkerClick(task)}
              icon={buildTaskMarkerIcon(task, {
                isLate: desc.isLate,
                isUnscheduled: desc.isUnscheduled,
                isHighlighted: desc.isHighlighted,
                isSelected: desc.isSelected,
                alertColor: desc.alertColor,
                showTechnicianColors: !!showTechnicianColors,
                techColor: desc.techColor,
                zoom: mapZoomBucket,
              })}
              title={desc.markerTitle}
            />
          );
        })}
    </>
  );
}