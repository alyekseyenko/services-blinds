"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isNeedsSchedulingStage, isTaskCancelled } from "@/lib/crm/contract";
import {
  firstOpenStopIndex,
  itineraryStopOnDrivingRoute,
  mergeTechnicianDayPool,
  technicianDayItinerary,
} from "@/lib/map/technicianDayItinerary";
import { toLisbonYmd } from "@/lib/visits/historyFilters";

type LatLng = { lat: number; lng: number };

type TechLocationMarker = {
  technicianId: string;
  technicianName: string;
  lat: number;
  lng: number;
};

export function useMapDirectionsRoutes(params: {
  isLoaded: boolean;
  tasks: any[];
  allOpportunities: any[];
  dayHistoryOpportunities: any[];
  selectedTechMarker: TechLocationMarker | null;
  showOwnDayRoute: boolean;
  isTechnicianView: boolean;
  userLocation: LatLng | null;
  optimizedRoute: any[] | null;
  hqLocation: { coordinates: [number, number] } | null;
  onRouteUpdate: (routeData: any) => void;
}) {
  const {
    isLoaded,
    tasks,
    allOpportunities,
    dayHistoryOpportunities,
    selectedTechMarker,
    showOwnDayRoute,
    isTechnicianView,
    userLocation,
    optimizedRoute,
    hqLocation,
    onRouteUpdate,
  } = params;

  const onRouteUpdateRef = useRef(onRouteUpdate);
  useEffect(() => {
    onRouteUpdateRef.current = onRouteUpdate;
  }, [onRouteUpdate]);

  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [techLiveRouteDirections, setTechLiveRouteDirections] = useState<google.maps.DirectionsResult | null>(
    null
  );

  const techAssignedTasks = useMemo(() => {
    if (!selectedTechMarker) return [];
    const live = allOpportunities && allOpportunities.length > 0 ? allOpportunities : tasks;
    const pool = mergeTechnicianDayPool(live, dayHistoryOpportunities);
    const dayYmd = toLisbonYmd(new Date());
    if (!dayYmd) return [];
    return technicianDayItinerary(pool, {
      technicianId: selectedTechMarker.technicianId,
      technicianName: selectedTechMarker.technicianName,
      dayYmd,
    });
  }, [selectedTechMarker, allOpportunities, dayHistoryOpportunities, tasks]);

  const technicianDayStops = useMemo(() => {
    if (!isTechnicianView) return [];
    return tasks
      .filter((task) => {
        if (!task.coordinates || !Array.isArray(task.coordinates)) return false;
        return !isTaskCancelled(task.status || task.taskStatus);
      })
      .sort((a, b) => {
        const timeA = new Date(a.scheduledAt || a.dueDate || 0).getTime();
        const timeB = new Date(b.scheduledAt || b.dueDate || 0).getTime();
        return timeA - timeB;
      });
  }, [isTechnicianView, tasks]);

  const ownDayStops = useMemo(
    () => (showOwnDayRoute ? technicianDayStops : []),
    [showOwnDayRoute, technicianDayStops]
  );

  const unscheduledNearTech = useMemo(() => {
    if (!selectedTechMarker) return [];
    const pool = allOpportunities && allOpportunities.length > 0 ? allOpportunities : tasks;
    return pool.filter(
      (task) =>
        task.coordinates &&
        Array.isArray(task.coordinates) &&
        isNeedsSchedulingStage(task.stage) &&
        !task.hasScheduledTask
    );
  }, [selectedTechMarker, allOpportunities, tasks]);

  const numberedStops = useMemo(
    () => (selectedTechMarker ? techAssignedTasks : ownDayStops),
    [selectedTechMarker, techAssignedTasks, ownDayStops]
  );

  const liveRouteOrigin = useMemo(() => {
    if (selectedTechMarker) return { lat: selectedTechMarker.lat, lng: selectedTechMarker.lng };
    if (userLocation) return { lat: userLocation.lat, lng: userLocation.lng };
    const first = numberedStops[0]?.coordinates;
    if (!first) return null;
    return { lat: first[0], lng: first[1] };
  }, [selectedTechMarker, userLocation, numberedStops]);

  const nextStopIndex = useMemo(() => firstOpenStopIndex(numberedStops), [numberedStops]);

  const remainingStops = useMemo(
    () => numberedStops.filter((stop) => itineraryStopOnDrivingRoute(stop)),
    [numberedStops]
  );

  const directionStops = useMemo(() => {
    const openStops = remainingStops;
    if (!selectedTechMarker && !userLocation) return openStops.slice(1);
    return openStops;
  }, [selectedTechMarker, userLocation, remainingStops]);

  const shouldComputeTechLiveRoute = Boolean(
    isLoaded && liveRouteOrigin && directionStops.length > 0 && (selectedTechMarker || showOwnDayRoute)
  );

  const shouldComputeOptimizedRoute = Boolean(
    optimizedRoute && optimizedRoute.length > 0 && hqLocation && isLoaded
  );

  const displayTechLiveRouteDirections = shouldComputeTechLiveRoute ? techLiveRouteDirections : null;
  const displayDirectionsResponse = shouldComputeOptimizedRoute ? directionsResponse : null;

  useEffect(() => {
    if (!shouldComputeTechLiveRoute) return;

    const directionsService = new window.google.maps.DirectionsService();

    if (directionStops.length === 1) {
      directionsService.route(
        {
          origin: liveRouteOrigin!,
          destination: {
            lat: directionStops[0].coordinates[0],
            lng: directionStops[0].coordinates[1],
          },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setTechLiveRouteDirections(result);
          } else {
            setTechLiveRouteDirections(null);
          }
        }
      );
    } else {
      const stopsForRoute = directionStops.slice(0, 26);
      const destination = {
        lat: stopsForRoute[stopsForRoute.length - 1].coordinates[0],
        lng: stopsForRoute[stopsForRoute.length - 1].coordinates[1],
      };
      const waypoints = stopsForRoute.slice(0, -1).map((t) => ({
        location: { lat: t.coordinates[0], lng: t.coordinates[1] },
        stopover: true,
      }));

      directionsService.route(
        {
          origin: liveRouteOrigin!,
          destination,
          waypoints,
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setTechLiveRouteDirections(result);
          } else {
            setTechLiveRouteDirections(null);
          }
        }
      );
    }
  }, [shouldComputeTechLiveRoute, liveRouteOrigin, directionStops, isLoaded]);

  useEffect(() => {
    if (!shouldComputeOptimizedRoute || !hqLocation?.coordinates || !optimizedRoute?.length) {
      setDirectionsResponse(null);
      onRouteUpdateRef.current(null);
      return;
    }

    const timer = window.setTimeout(() => {
      const directionsService = new window.google.maps.DirectionsService();

      const visitStops = optimizedRoute.filter(
        (step) => !step.isReturn && step.coordinates?.length === 2
      );
      if (visitStops.length === 0) {
        setDirectionsResponse(null);
        onRouteUpdateRef.current(null);
        return;
      }

      const origin = { lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] };
      const destination = { lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] };

      directionsService.route(
        {
          origin,
          destination,
          waypoints: visitStops.map((step) => ({
            location: { lat: step.coordinates![0], lng: step.coordinates![1] },
            stopover: true,
          })),
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setDirectionsResponse(result);

            const totalDistance =
              result.routes[0].legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0) / 1000;
            const totalDuration =
              result.routes[0].legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0) / 60;

            const hasTolls = result.routes[0].warnings.some(
              (w) =>
                w.toLowerCase().includes("toll") ||
                w.toLowerCase().includes("portagem") ||
                w.toLowerCase().includes("pago")
            );

            onRouteUpdateRef.current({
              distanceKm: totalDistance,
              durationMin: Math.round(totalDuration),
              hasTolls,
            });
          } else {
            console.error(`error fetching directions ${status}`);
          }
        }
      );
    }, 400);

    return () => window.clearTimeout(timer);
  }, [shouldComputeOptimizedRoute, optimizedRoute, hqLocation, isLoaded]);

  return {
    techAssignedTasks,
    technicianDayStops,
    ownDayStops,
    unscheduledNearTech,
    numberedStops,
    nextStopIndex,
    displayTechLiveRouteDirections,
    displayDirectionsResponse,
  };
}