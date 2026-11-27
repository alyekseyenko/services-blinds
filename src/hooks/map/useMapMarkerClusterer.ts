"use client";

import { useEffect, useMemo, useRef } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { createMapClusterRenderer } from "@/lib/map/mapClusterRenderer";
import { buildTaskMarkerIcon } from "@/components/map/taskMarkerIcon";
import { buildTaskMarkerDescriptor } from "@/lib/map/taskMarkerDescriptor";

export function useMapMarkerClusterer(params: {
  map: google.maps.Map | null;
  isLoaded: boolean;
  isTechnicianView: boolean;
  clusteringEnabled: boolean;
  tasks: any[];
  selectedTechMarker: any | null;
  techAssignedTasks: any[];
  selectedMarker: any | null;
  highlightedIds: string[];
  showTechnicianColors: boolean;
  mapZoomBucket: number;
  useMarkerPopup: boolean;
  suspendAutoFit: () => void;
  setSelectedMarker: (task: any) => void;
  onTaskSelectRef: React.MutableRefObject<(task: any) => void>;
}) {
  const {
    map,
    isLoaded,
    isTechnicianView,
    clusteringEnabled,
    tasks,
    selectedTechMarker,
    techAssignedTasks,
    selectedMarker,
    highlightedIds,
    showTechnicianColors,
    mapZoomBucket,
    useMarkerPopup,
    suspendAutoFit,
    setSelectedMarker,
    onTaskSelectRef,
  } = params;

  const clustererRef = useRef<MarkerClusterer | null>(null);
  const clusterMarkersRef = useRef<google.maps.Marker[]>([]);

  const clusterableTasks = useMemo(() => {
    if (selectedTechMarker) return [];
    return tasks.filter((task) => {
      if (!task.coordinates || !Array.isArray(task.coordinates)) return false;
      const isStopOfSelectedTech =
        selectedTechMarker &&
        techAssignedTasks.some(
          (st) =>
            (st.id && st.id === task.id) || (st.twentyId && st.twentyId === task.twentyId)
        );
      return !isStopOfSelectedTech;
    });
  }, [tasks, selectedTechMarker, techAssignedTasks]);

  const clusteringAvailable = !isTechnicianView && clusterableTasks.length >= 6;
  const useTaskClustering = clusteringAvailable && clusteringEnabled;

  const clusterTasksKey = [
    clusterableTasks
      .map((t) =>
        [
          t.id,
          t.technician ?? "",
          t.stage ?? "",
          t.coordinates?.join(",") ?? "",
          t.dueDate ?? "",
          t.delayAlert ?? "",
          t.hasScheduledTask ? "1" : "0",
          t.serviceType ?? "",
          t.status ?? "",
          t.taskStatus ?? "",
        ].join(":")
      )
      .join("|"),
    `z${mapZoomBucket}`,
  ].join("|");

  const highlightedKey = highlightedIds.join(",");

  useEffect(() => {
    if (!map || !isLoaded || !useTaskClustering) {
      clustererRef.current?.setMap(null);
      clustererRef.current?.clearMarkers();
      clusterMarkersRef.current.forEach((marker) => {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      });
      clusterMarkersRef.current = [];
      clustererRef.current = null;
      return;
    }

    const clusterRenderer = createMapClusterRenderer();
    const markerZoom = mapZoomBucket;

    const nextMarkers = clusterableTasks.map((task) => {
      const desc = buildTaskMarkerDescriptor(task, {
        highlightedIds,
        selectedMarker,
        showTechnicianColors: !!showTechnicianColors,
      });

      const marker = new google.maps.Marker({
        position: { lat: task.coordinates[0], lng: task.coordinates[1] },
        icon: buildTaskMarkerIcon(task, {
          isLate: desc.isLate,
          isUnscheduled: desc.isUnscheduled,
          isHighlighted: desc.isHighlighted,
          isSelected: desc.isSelected,
          alertColor: desc.alertColor,
          showTechnicianColors: !!showTechnicianColors,
          techColor: desc.techColor,
          zoom: markerZoom,
          statusBadge: desc.statusBadge,
        }),
        title: desc.markerTitle,
      });

      marker.set("mapHasLate", desc.isLate);

      marker.addListener("click", () => {
        setSelectedMarker(task);
        if (!useMarkerPopup) {
          onTaskSelectRef.current(task);
        }
      });

      return marker;
    });

    clustererRef.current?.setMap(null);
    clustererRef.current?.clearMarkers();
    clusterMarkersRef.current.forEach((marker) => {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    });

    clustererRef.current = new MarkerClusterer({
      map,
      markers: nextMarkers,
      renderer: clusterRenderer,
      onClusterClick: (_event, cluster) => {
        suspendAutoFit();
        const bounds = cluster.bounds;
        if (bounds && !bounds.isEmpty()) {
          map.fitBounds(bounds, { top: 72, right: 72, bottom: 96, left: 72 });
          return;
        }
        map.panTo(cluster.position);
        const z = map.getZoom();
        map.setZoom(typeof z === "number" ? Math.min(z + 3, 17) : 15);
      },
    });
    clusterMarkersRef.current = nextMarkers;

    return () => {
      clustererRef.current?.setMap(null);
      clustererRef.current?.clearMarkers();
      clusterMarkersRef.current.forEach((marker) => {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      });
      clusterMarkersRef.current = [];
      clustererRef.current = null;
    };
  }, [
    map,
    isLoaded,
    useTaskClustering,
    clusterTasksKey,
    highlightedKey,
    showTechnicianColors,
    useMarkerPopup,
    suspendAutoFit,
    clusterableTasks,
    highlightedIds,
    selectedMarker,
    mapZoomBucket,
    setSelectedMarker,
    onTaskSelectRef,
  ]);

  return {
    clusterableTasks,
    clusteringAvailable,
    useTaskClustering,
  };
}