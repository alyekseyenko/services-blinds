"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { resolveTaskOverdue } from "@/lib/taskUtils";
import { HQ_LAT, HQ_LNG } from "@/lib/hq";
import { APP_LOGO_PATH, MAP_HQ_TITLE } from "@/lib/branding";
import { TechnicianDaySidebar } from "@/components/map/TechnicianDaySidebar";
import { TechnicianDayRouteBar } from "@/components/map/TechnicianDayRouteBar";
import { MapOverlayControls } from "@/components/map/MapOverlayControls";
import { StreetViewPegman } from "@/components/map/StreetViewPegman";
import { useMapClusteringEnabled } from "@/hooks/useMapClustering";
import { MapLegend, useMapLegendOpen } from "@/components/map/MapLegend";
import { OPERATIONS_MAP_CANVAS, OPERATIONS_MAP_STYLES } from "@/lib/map/googleMapStyles";
import { setMapStreetViewOpen } from "@/lib/map/streetViewMode";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { getHqLogoPixelSize, getMapZoomBucket, getUserLocationScale } from "@/lib/map/markerScale";
import { appendHqAndUser, collectPositionsFromTasks, taskCoordinatesToLatLng } from "@/lib/map/mapBounds";
import { useMapAutoFit } from "@/hooks/useMapAutoFit";
import { TechnicianOfflineMapPanel } from "@/components/map/TechnicianOfflineMapPanel";
import { useMapMarkerClusterer } from "@/hooks/map/useMapMarkerClusterer";
import { useMapDirectionsRoutes } from "@/hooks/map/useMapDirectionsRoutes";
import { MapEntityMarkers } from "@/components/map/MapEntityMarkers";
import { MapPinPopups } from "@/components/map/MapPinPopups";
import { MapOptimizedRouteOverlay } from "@/components/map/MapOptimizedRouteOverlay";

const containerStyle = {
  width: "100%",
  height: "100%",
};

interface MapComponentProps {
  tasks: any[];
  allOpportunities?: any[];
  dayHistoryOpportunities?: any[];
  onTaskSelect: (task: any) => void;
  showTechnicianColors?: boolean;
  highlightedIds?: string[];
  hqLocation?: { coordinates: [number, number]; name?: string; address?: string } | null;
  optimizedRoute?: any[] | null;
  fuelPrice?: number;
  fuelConsumption?: number;
  onRouteUpdate?: (routeData: any) => void;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  isTechnicianView?: boolean;
  locationSharingEnabled?: boolean;
  onToggleLocationSharing?: () => void;
  techniciansLocations?: Array<{
    technicianId: string;
    technicianName: string;
    lat: number;
    lng: number;
    lastUpdate: string;
    accuracy?: number;
  }>;
  onTechnicianSelect?: (tech: any) => void;
  markerInteraction?: "popup" | "direct";
  onScheduleFromMap?: (task: any) => void;
  autoFitKey?: string;
  autoFitScope?: "all" | "overdue";
  routeSelectionMode?: boolean;
  isTaskInRoute?: (task: any) => boolean;
  onToggleRouteFromMap?: (task: any) => void;
  isOnline?: boolean;
}

export default function MapComponent({
  tasks,
  allOpportunities = [],
  dayHistoryOpportunities = [],
  onTaskSelect,
  showTechnicianColors = false,
  highlightedIds = [],
  hqLocation = null,
  optimizedRoute = null,
  fuelPrice = 1.9,
  fuelConsumption = 7.0,
  onRouteUpdate = () => {},
  userLocation = null,
  isTechnicianView = false,
  locationSharingEnabled = true,
  onToggleLocationSharing,
  techniciansLocations = [],
  onTechnicianSelect,
  markerInteraction = "direct",
  onScheduleFromMap,
  autoFitKey = "default",
  autoFitScope = "all",
  routeSelectionMode = false,
  isTaskInRoute,
  onToggleRouteFromMap,
  isOnline = true,
}: MapComponentProps) {
  const useMarkerPopup = markerInteraction === "popup";
  const overlayVariant = isTechnicianView ? "technician" : "admin";
  const isMapDesktop = useMediaMinWidth(768);
  const hideNativeMapChrome = isTechnicianView || !isMapDesktop;
  const googleMapOptions = useMemo(
    () => ({
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: !hideNativeMapChrome,
      zoomControlOptions: hideNativeMapChrome
        ? undefined
        : { position: 4 as google.maps.ControlPosition },
      rotateControl: false,
      scaleControl: false,
      keyboardShortcuts: false,
      gestureHandling: "greedy" as const,
      clickableIcons: false,
      backgroundColor: OPERATIONS_MAP_CANVAS,
      styles: OPERATIONS_MAP_STYLES,
    }),
    [hideNativeMapChrome]
  );
  const { legendOpen, setLegendOpen } = useMapLegendOpen(overlayVariant);
  const { clusteringEnabled, toggleClustering } = useMapClusteringEnabled();
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [streetViewOpen, setStreetViewOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const [selectedTechMarker, setSelectedTechMarker] = useState<any | null>(null);
  const [technicianPinPanel, setTechnicianPinPanel] = useState<"hq" | "user" | null>(null);
  const [showOwnDayRoute, setShowOwnDayRoute] = useState(false);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | null>(null);
  const [mapZoomBucket, setMapZoomBucket] = useState(13);
  const [renderNow, setRenderNow] = useState(() => Date.now());
  const onTaskSelectRef = useRef(onTaskSelect);

  useEffect(() => {
    onTaskSelectRef.current = onTaskSelect;
  }, [onTaskSelect]);

  useEffect(() => {
    const interval = setInterval(() => setRenderNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const center = useMemo(() => {
    if (hqLocation && hqLocation.coordinates) {
      return { lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] };
    }
    const firstTask = tasks.find((t) => t.coordinates && Array.isArray(t.coordinates));
    if (firstTask) {
      return { lat: firstTask.coordinates[0], lng: firstTask.coordinates[1] };
    }
    return { lat: HQ_LAT, lng: HQ_LNG };
  }, [hqLocation, tasks]);

  const hasCenteredOnUserRef = useRef(false);

  useEffect(() => {
    if (userLocation && map && !hasCenteredOnUserRef.current) {
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      hasCenteredOnUserRef.current = true;
    }
  }, [userLocation, map]);

  useEffect(() => {
    if (selectedMarker?.coordinates && map) {
      map.panTo({
        lat: selectedMarker.coordinates[0],
        lng: selectedMarker.coordinates[1],
      });
    }
  }, [selectedMarker, map]);

  useEffect(() => {
    if (!map) return;
    const streetView = map.getStreetView();
    streetView.setOptions({
      addressControl: false,
      fullscreenControl: false,
      zoomControl: false,
      panControl: false,
      enableCloseButton: false,
      motionTracking: false,
      motionTrackingControl: false,
      showRoadLabels: false,
      linksControl: true,
      clickToGo: true,
    });
    const sync = () => {
      const visible = streetView.getVisible();
      setStreetViewOpen(visible);
      setMapStreetViewOpen(visible);
    };
    sync();
    const listener = streetView.addListener("visible_changed", sync);
    return () => {
      listener.remove();
      setStreetViewOpen(false);
      setMapStreetViewOpen(false);
    };
  }, [map]);

  const exitStreetView = useCallback(() => {
    map?.getStreetView().setVisible(false);
  }, [map]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onMapIdle = useCallback(() => {
    if (!map) return;
    const z = map.getZoom();
    if (typeof z !== "number") return;
    const bucket = getMapZoomBucket(z);
    setMapZoomBucket((prev) => (prev === bucket ? prev : bucket));
  }, [map]);

  const fitUserSnapshotRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    fitUserSnapshotRef.current = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : null;
  }, [autoFitKey]);

  const fitPoints = useMemo(() => {
    const scopedTasks =
      autoFitScope === "overdue" ? tasks.filter((t) => resolveTaskOverdue(t)) : tasks;
    const taskPoints = collectPositionsFromTasks(scopedTasks);
    if (autoFitScope === "overdue") return taskPoints;
    const hq = hqLocation?.coordinates ? taskCoordinatesToLatLng(hqLocation.coordinates) : null;
    const user = fitUserSnapshotRef.current;
    return appendHqAndUser(taskPoints, hq, user);
  }, [tasks, hqLocation, autoFitScope, autoFitKey]);

  const { fitNow, suspendAutoFit } = useMapAutoFit(map, fitPoints, autoFitKey);

  const hqLogoSize = getHqLogoPixelSize(mapZoomBucket);

  const hqLogoIcon = useMemo(() => {
    if (!isLoaded || typeof window === "undefined") return undefined;
    return {
      url: APP_LOGO_PATH,
      scaledSize: new window.google.maps.Size(hqLogoSize, hqLogoSize),
      anchor: new window.google.maps.Point(hqLogoSize / 2, hqLogoSize / 2),
    };
  }, [isLoaded, hqLogoSize]);

  const handleFitToPins = useCallback(() => {
    fitNow(fitPoints);
  }, [fitNow, fitPoints]);

  const handleRecenter = useCallback(() => {
    if (!map) return;
    if (isTechnicianView && userLocation) {
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      map.setZoom(Math.max(map.getZoom() ?? 14, 15));
      return;
    }
    if (hqLocation?.coordinates) {
      map.panTo({ lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] });
      map.setZoom(13);
    }
  }, [map, isTechnicianView, userLocation, hqLocation]);

  const closeTechnicianPanels = useCallback(() => {
    setTechnicianPinPanel(null);
  }, []);

  const closeAllMapPopups = useCallback(() => {
    setSelectedMarker(null);
    setSelectedTechMarker(null);
    closeTechnicianPanels();
  }, [closeTechnicianPanels]);

  const mapPopupOpen =
    Boolean(selectedMarker) || Boolean(selectedTechMarker) || technicianPinPanel !== null;

  useEffect(() => {
    if (!mapPopupOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAllMapPopups();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mapPopupOpen, closeAllMapPopups]);

  const panToUserLocation = useCallback(() => {
    if (!map || !userLocation) return;
    map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
    map.setZoom(Math.max(map.getZoom() ?? 14, 15));
  }, [map, userLocation]);

  const toggleSatellite = useCallback(() => {
    if (!map) return;
    const next = !satellite;
    setSatellite(next);
    if (next) {
      map.setMapTypeId("hybrid");
      map.setOptions({ styles: [] });
    } else {
      map.setMapTypeId("roadmap");
      map.setOptions({ styles: OPERATIONS_MAP_STYLES });
    }
  }, [map, satellite]);

  const {
    techAssignedTasks,
    technicianDayStops,
    ownDayStops,
    unscheduledNearTech,
    numberedStops,
    nextStopIndex,
    displayTechLiveRouteDirections,
    displayDirectionsResponse,
  } = useMapDirectionsRoutes({
    isLoaded,
    tasks,
    allOpportunities,
    dayHistoryOpportunities,
    selectedTechMarker,
    showOwnDayRoute,
    isTechnicianView,
    userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
    optimizedRoute,
    hqLocation: hqLocation?.coordinates ? { coordinates: hqLocation.coordinates } : null,
    onRouteUpdate,
  });

  const { clusteringAvailable, useTaskClustering } = useMapMarkerClusterer({
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
  });

  const handleToggleOwnDayRoute = useCallback(() => {
    setShowOwnDayRoute((current) => {
      const next = !current;
      if (next) {
        const points = technicianDayStops.map((stop) => ({
          lat: stop.coordinates[0],
          lng: stop.coordinates[1],
        }));
        if (userLocation) points.push({ lat: userLocation.lat, lng: userLocation.lng });
        fitNow(points);
      }
      return next;
    });
  }, [technicianDayStops, userLocation, fitNow]);

  const handleTaskMarkerClick = useCallback(
    (task: any) => {
      setSelectedMarker(task);
      if (!useMarkerPopup) {
        onTaskSelectRef.current(task);
      }
    },
    [useMarkerPopup]
  );

  const handleTechnicianClick = useCallback(
    (tech: (typeof techniciansLocations)[0]) => {
      setSelectedTechMarker(tech);
      onTechnicianSelect?.(tech);
    },
    [onTechnicianSelect]
  );

  if (isTechnicianView && !isOnline) {
    return <TechnicianOfflineMapPanel tasks={tasks} onTaskSelect={onTaskSelect} />;
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full flex-col gap-4 p-4" aria-busy="true" aria-label="A carregar mapa">
        <div className="h-12 w-full max-w-md animate-pulse rounded-2xl bg-secondary/80" />
        <div className="flex-1 animate-pulse rounded-2xl bg-secondary/80" />
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter || center}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={onMapIdle}
        onClick={() => closeAllMapPopups()}
        options={googleMapOptions}
      >
        {hqLocation && hqLogoIcon && (
          <Marker
            position={{ lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] }}
            icon={hqLogoIcon}
            title={hqLocation.name || MAP_HQ_TITLE}
            zIndex={900}
            onClick={() => {
              setSelectedMarker(null);
              setSelectedTechMarker(null);
              if (isTechnicianView) setTechnicianPinPanel("hq");
            }}
          />
        )}

        {userLocation && (
          <Marker
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            onClick={() => {
              if (!isTechnicianView) return;
              setSelectedMarker(null);
              setSelectedTechMarker(null);
              setTechnicianPinPanel("user");
            }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: locationSharingEnabled ? "#10b981" : "#f59e0b",
              fillOpacity: 1,
              strokeWeight: 4,
              strokeColor: "#ffffff",
              scale: getUserLocationScale(mapZoomBucket, isTechnicianView),
            }}
            title={
              locationSharingEnabled
                ? "Minha localização — GPS ativo"
                : "Minha localização — GPS pausado"
            }
            zIndex={1000}
          />
        )}

        <MapPinPopups
          isTechnicianView={isTechnicianView}
          useMarkerPopup={useMarkerPopup}
          technicianPinPanel={technicianPinPanel}
          hqLocation={hqLocation}
          userLocation={userLocation}
          locationSharingEnabled={locationSharingEnabled}
          onToggleLocationSharing={onToggleLocationSharing}
          onCloseAll={closeAllMapPopups}
          onCloseTechnicianPanels={closeTechnicianPanels}
          onPanToUser={panToUserLocation}
          technicianDayStops={technicianDayStops}
          showOwnDayRoute={showOwnDayRoute}
          onToggleOwnDayRoute={handleToggleOwnDayRoute}
          selectedMarker={selectedMarker}
          onClearSelectedMarker={() => setSelectedMarker(null)}
          onTaskSelect={onTaskSelect}
          onScheduleFromMap={onScheduleFromMap}
          routeSelectionMode={routeSelectionMode}
          isTaskInRoute={isTaskInRoute}
          onToggleRouteFromMap={onToggleRouteFromMap}
        />

        <MapEntityMarkers
          techniciansLocations={techniciansLocations}
          renderNow={renderNow}
          mapZoomBucket={mapZoomBucket}
          selectedTechMarker={selectedTechMarker}
          onTechnicianClick={handleTechnicianClick}
          numberedStops={numberedStops}
          nextStopIndex={nextStopIndex}
          onStopClick={onTaskSelect}
          useTaskClustering={useTaskClustering}
          tasks={tasks}
          highlightedIds={highlightedIds}
          selectedMarker={selectedMarker}
          showTechnicianColors={showTechnicianColors}
          useMarkerPopup={useMarkerPopup}
          onTaskMarkerClick={handleTaskMarkerClick}
        />

        {displayTechLiveRouteDirections && (
          <DirectionsRenderer
            directions={displayTechLiveRouteDirections}
            options={{
              polylineOptions: {
                strokeColor: "#0284c7",
                strokeOpacity: 0.9,
                strokeWeight: 6,
              },
              suppressMarkers: true,
            }}
          />
        )}

        {displayDirectionsResponse && (
          <DirectionsRenderer
            directions={displayDirectionsResponse}
            options={{
              polylineOptions: {
                strokeColor: "#2563eb",
                strokeOpacity: 0.8,
                strokeWeight: 5,
              },
              suppressMarkers: true,
            }}
          />
        )}
      </GoogleMap>

      {!streetViewOpen && !isTechnicianView ? (
        <StreetViewPegman map={map} satellite={satellite} onToggleSatellite={toggleSatellite} />
      ) : null}

      {streetViewOpen ? (
        <button
          type="button"
          onClick={exitStreetView}
          className="absolute left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-border-strong bg-ink px-4 text-sm font-black text-ink-foreground shadow-xl"
        >
          <X className="h-5 w-5" aria-hidden />
          Sair da vista de rua
        </button>
      ) : (
        <>
          <MapOverlayControls
            variant={overlayVariant}
            legendOpen={legendOpen}
            onToggleLegend={() => setLegendOpen(!legendOpen)}
            onFitBounds={handleFitToPins}
            onRecenter={handleRecenter}
            recenterLabel={isTechnicianView ? "Centrar na minha posição" : "Centrar na sede"}
            clusteringAvailable={clusteringAvailable}
            clusteringEnabled={clusteringEnabled}
            onToggleClustering={toggleClustering}
            locationSharingEnabled={locationSharingEnabled}
            onToggleLocationSharing={isTechnicianView ? onToggleLocationSharing : undefined}
            stackedToolbar={
              !streetViewOpen && isTechnicianView ? (
                <StreetViewPegman
                  layout="stacked"
                  map={map}
                  satellite={satellite}
                  onToggleSatellite={toggleSatellite}
                />
              ) : undefined
            }
          />
          <MapLegend open={legendOpen} onClose={() => setLegendOpen(false)} variant={overlayVariant} />
          {isTechnicianView && showOwnDayRoute && ownDayStops.length > 0 ? (
            <TechnicianDayRouteBar
              stops={ownDayStops}
              origin={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null}
              onExit={() => setShowOwnDayRoute(false)}
            />
          ) : null}
          {selectedTechMarker ? (
            <TechnicianDaySidebar
              technicianName={selectedTechMarker.technicianName || "Técnico"}
              origin={{ lat: selectedTechMarker.lat, lng: selectedTechMarker.lng }}
              stops={techAssignedTasks}
              unscheduled={unscheduledNearTech}
              onClose={() => setSelectedTechMarker(null)}
              onOpenStop={(stop) => onTaskSelect(stop)}
            />
          ) : null}
          {displayDirectionsResponse && optimizedRoute && (
            <MapOptimizedRouteOverlay
              directions={displayDirectionsResponse}
              fuelPrice={fuelPrice}
              fuelConsumption={fuelConsumption}
            />
          )}
        </>
      )}
    </div>
  );
}