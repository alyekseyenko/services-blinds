"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { resolveTaskOverdue } from '@/lib/taskUtils';
import { HQ_LAT, HQ_LNG } from '@/lib/hq';
import { APP_LOGO_PATH, MAP_HQ_TITLE } from '@/lib/branding';
import { isNeedsSchedulingStage, isTaskCompleted } from '@/lib/crm/contract';
import { MapMarkerInfoWindow } from '@/components/admin/MapMarkerInfoWindow';
import { MapOverlayControls } from '@/components/map/MapOverlayControls';
import { useMapClusteringEnabled } from '@/hooks/useMapClustering';
import { MapLegend, useMapLegendOpen } from '@/components/map/MapLegend';
import { TaskMapInfoWindow } from '@/components/map/TaskMapInfoWindow';
import { MapInfoWindowShell } from '@/components/map/MapInfoWindowShell';
import { createMapClusterRenderer } from '@/lib/map/mapClusterRenderer';
import {
  buildRouteStopTeardropSvg,
  MAP_PIN_TIP_X,
  MAP_PIN_TIP_Y,
  MAP_PIN_VIEW_HEIGHT,
  MAP_PIN_VIEW_WIDTH,
} from '@/lib/map/serviceMarkerArt';
import { buildTaskMarkerIcon } from '@/components/map/taskMarkerIcon';
import { OPERATIONS_MAP_STYLES } from '@/lib/map/googleMapStyles';
import { useMediaMinWidth } from '@/hooks/useMediaMinWidth';
import {
  getHqLogoPixelSize,
  getRouteStopPixelSize,
  getServiceMarkerPixelSize,
  getTechnicianVanPixelSize,
  getUserLocationScale,
  shouldShowDenseLabels,
  getMapZoomBucket,
} from '@/lib/map/markerScale';
import { appendHqAndUser, collectPositionsFromTasks, taskCoordinatesToLatLng } from '@/lib/map/mapBounds';
import { useMapAutoFit } from '@/hooks/useMapAutoFit';
import { TechnicianOfflineMapPanel } from '@/components/map/TechnicianOfflineMapPanel';
import { useOnboardingMapDemo, ONBOARDING_DEMO_TASK_ID } from '@/hooks/useOnboardingMapDemo';
import { ONBOARDING_CLOSE_MAP_POPUP_EVENT } from '@/lib/onboarding/events';
import {
  ONBOARDING_TOUR_ACTION_EVENT,
  type OnboardingTourActionDetail,
} from '@/lib/onboarding/tourActions';
import {
  createAdminOnboardingDemoTechnicianLocation,
  ONBOARDING_DEMO_TECH_ID,
  ONBOARDING_DEMO_TECH_NAME,
} from '@/lib/onboarding/demoAdminMapTech';
import type { OnboardingTourId } from '@/lib/schemas/onboarding';
import type { TechnicianLocation } from '@/hooks/useTechnicianLocations';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const technicianColors = [
  '#3B82F6', // Azul
  '#10B981', // Verde
  '#F59E0B', // Laranja
  '#EF4444', // Vermelho
  '#8B5CF6', // Roxo
  '#EC4899', // Rosa
  '#06B6D4', // Ciano
  '#84CC16', // Lima
];

function getTechnicianColor(technicianName: string | null): string {
  if (!technicianName) return technicianColors[0];
  const hash = technicianName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return technicianColors[hash % technicianColors.length];
}

function teardropAnchor(width: number, height: number) {
  return new window.google.maps.Point(
    (MAP_PIN_TIP_X / MAP_PIN_VIEW_WIDTH) * width,
    (MAP_PIN_TIP_Y / MAP_PIN_VIEW_HEIGHT) * height,
  );
}

interface MapComponentProps {
  tasks: any[];
  allOpportunities?: any[];
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
  /** Popup first; full panel opens via actions inside the popup */
  markerInteraction?: 'popup' | 'direct';
  onScheduleFromMap?: (task: any) => void;
  /** Changes to this key re-trigger auto-fit (e.g. filter or day). */
  autoFitKey?: string;
  /** When `overdue`, auto-fit / fit button use only overdue task pins. */
  autoFitScope?: 'all' | 'overdue';
  routeSelectionMode?: boolean;
  isTaskInRoute?: (task: any) => boolean;
  onToggleRouteFromMap?: (task: any) => void;
  /** When false, technician map shows offline panel instead of Google Maps (no tile requests). */
  isOnline?: boolean;
  /** Injeta pin de formação durante o guia de onboarding (técnico / admin). */
  onboardingMapTourId?: Extract<OnboardingTourId, 'technician' | 'admin'>;
}

export default function MapComponent({ 
  tasks, 
  allOpportunities = [],
  onTaskSelect, 
  showTechnicianColors = false, 
  highlightedIds = [], 
  hqLocation = null, 
  optimizedRoute = null,
  fuelPrice = 1.90,
  fuelConsumption = 7.0,
  onRouteUpdate = () => {},
  userLocation = null,
  isTechnicianView = false,
  locationSharingEnabled = true,
  onToggleLocationSharing,
  techniciansLocations = [],
  onTechnicianSelect,
  markerInteraction = 'direct',
  onScheduleFromMap,
  autoFitKey = 'default',
  autoFitScope = 'all',
  routeSelectionMode = false,
  isTaskInRoute,
  onToggleRouteFromMap,
  isOnline = true,
  onboardingMapTourId,
}: MapComponentProps) {
  const useMarkerPopup = markerInteraction === 'popup';
  const {
    mapTasks: tasksForMap,
    openDemoPin,
    consumeOpenDemoPin,
    demoActive: onboardingDemoActive,
  } = useOnboardingMapDemo(tasks, onboardingMapTourId ?? 'technician');
  const displayTasks = onboardingMapTourId ? tasksForMap : tasks;
  const overlayVariant = isTechnicianView ? 'technician' : 'admin';
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
      backgroundColor: "#e8eaef",
      styles: OPERATIONS_MAP_STYLES,
    }),
    [hideNativeMapChrome]
  );
  const { legendOpen, setLegendOpen } = useMapLegendOpen(overlayVariant);
  const { clusteringEnabled, toggleClustering } = useMapClusteringEnabled();
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const [selectedTechMarker, setSelectedTechMarker] = useState<any | null>(null);
  const [technicianPinPanel, setTechnicianPinPanel] = useState<"hq" | "user" | null>(null);
  const [adminHqPanelOpen, setAdminHqPanelOpen] = useState(false);
  const [demoTechProgress, setDemoTechProgress] = useState(0.35);
  const demoTechAnimateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [techLiveRouteDirections, setTechLiveRouteDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | null>(null);
  const [mapZoomBucket, setMapZoomBucket] = useState(13);
  const [renderNow, setRenderNow] = useState(() => Date.now());
  const onRouteUpdateRef = useRef(onRouteUpdate);
  const onTaskSelectRef = useRef(onTaskSelect);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const clusterMarkersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    onRouteUpdateRef.current = onRouteUpdate;
  }, [onRouteUpdate]);

  useEffect(() => {
    onTaskSelectRef.current = onTaskSelect;
  }, [onTaskSelect]);

  useEffect(() => {
    const closePopup = () => setSelectedMarker(null);
    window.addEventListener(ONBOARDING_CLOSE_MAP_POPUP_EVENT, closePopup);
    return () => window.removeEventListener(ONBOARDING_CLOSE_MAP_POPUP_EVENT, closePopup);
  }, []);

  useEffect(() => {
    return () => {
      if (demoTechAnimateRef.current) clearInterval(demoTechAnimateRef.current);
    };
  }, []);

  const adminOnboardingMap =
    !isTechnicianView && onboardingMapTourId === "admin" && onboardingDemoActive;

  const techniciansOnMap = useMemo((): TechnicianLocation[] => {
    if (!adminOnboardingMap) return techniciansLocations;
    const demoTech = createAdminOnboardingDemoTechnicianLocation(demoTechProgress);
    const rest = techniciansLocations.filter((t) => t.technicianId !== ONBOARDING_DEMO_TECH_ID);
    return [demoTech, ...rest];
  }, [adminOnboardingMap, demoTechProgress, techniciansLocations]);

  useEffect(() => {
    if (!adminOnboardingMap) return;

    const onTourAction = (event: Event) => {
      const action = (event as CustomEvent<OnboardingTourActionDetail>).detail?.action;
      if (!action) return;

      if (action === "openAdminMapHqPanel") {
        setSelectedMarker(null);
        setSelectedTechMarker(null);
        setAdminHqPanelOpen(true);
        if (map && hqLocation?.coordinates) {
          map.panTo({ lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] });
          const z = map.getZoom();
          if (typeof z !== "number" || z < 13) map.setZoom(13);
        }
        return;
      }

      if (action === "selectAdminDemoTechnician") {
        setAdminHqPanelOpen(false);
        const tech = createAdminOnboardingDemoTechnicianLocation(demoTechProgress);
        setSelectedTechMarker(tech);
        if (map) {
          map.panTo({ lat: tech.lat, lng: tech.lng });
          const z = map.getZoom();
          if (typeof z !== "number" || z < 14) map.setZoom(14);
        }
        return;
      }

      if (action === "stopAdminDemoTechnicianAnimation") {
        if (demoTechAnimateRef.current) {
          clearInterval(demoTechAnimateRef.current);
          demoTechAnimateRef.current = null;
        }
        return;
      }

      if (action === "animateAdminDemoTechnician") {
        if (demoTechAnimateRef.current) clearInterval(demoTechAnimateRef.current);
        let step = 0;
        const steps = 10;
        demoTechAnimateRef.current = setInterval(() => {
          step += 1;
          const progress = Math.min(1, step / steps);
          setDemoTechProgress(progress);
          const pos = createAdminOnboardingDemoTechnicianLocation(progress);
          setSelectedTechMarker(pos);
          if (step >= steps && demoTechAnimateRef.current) {
            clearInterval(demoTechAnimateRef.current);
            demoTechAnimateRef.current = null;
          }
        }, 320);
      }
    };

    window.addEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourAction);
    return () => window.removeEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourAction);
  }, [adminOnboardingMap, demoTechProgress, hqLocation, map]);

  useEffect(() => {
    if (!onboardingMapTourId || !openDemoPin) return;
    const demo = displayTasks.find((t) => t.id === ONBOARDING_DEMO_TASK_ID);
    if (demo?.coordinates && map) {
      map.panTo({ lat: demo.coordinates[0], lng: demo.coordinates[1] });
      const z = map.getZoom();
      if (typeof z !== "number" || z < 14) {
        map.setZoom(14);
      }
    }
    if (demo) setSelectedMarker(demo);
    consumeOpenDemoPin();
  }, [consumeOpenDemoPin, displayTasks, map, onboardingMapTourId, openDemoPin]);

  useEffect(() => {
    const interval = setInterval(() => setRenderNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const center = useMemo(() => {
    if (hqLocation && hqLocation.coordinates) {
      return { lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] };
    }
    const firstTask = displayTasks.find(t => t.coordinates && Array.isArray(t.coordinates));
    if (firstTask) {
      return { lat: firstTask.coordinates[0], lng: firstTask.coordinates[1] };
    }
    return { lat: HQ_LAT, lng: HQ_LNG };
  }, [hqLocation, displayTasks]);

  const hasCenteredOnUserRef = useRef(false);

  // Centralizar dinamicamente na localização do técnico APENAS na primeira vez que estiver disponível
  useEffect(() => {
    if (userLocation && map && !hasCenteredOnUserRef.current) {
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      hasCenteredOnUserRef.current = true;
    }
  }, [userLocation, map]);

  // Centralizar na tarefa selecionada
  useEffect(() => {
    if (selectedMarker?.coordinates && map) {
      map.panTo({
        lat: selectedMarker.coordinates[0],
        lng: selectedMarker.coordinates[1],
      });
    }
  }, [selectedMarker, map]);

  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback(mapInstance: google.maps.Map) {
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
      autoFitScope === 'overdue'
        ? displayTasks.filter((t) => resolveTaskOverdue(t))
        : displayTasks;
    const taskPoints = collectPositionsFromTasks(scopedTasks);
    if (autoFitScope === 'overdue') return taskPoints;
    const hq =
      hqLocation?.coordinates
        ? taskCoordinatesToLatLng(hqLocation.coordinates)
        : null;
    const user = fitUserSnapshotRef.current;
    return appendHqAndUser(taskPoints, hq, user);
  }, [displayTasks, hqLocation, autoFitScope, autoFitKey]);

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
    setAdminHqPanelOpen(false);
    closeTechnicianPanels();
  }, [closeTechnicianPanels]);

  const mapPopupOpen =
    Boolean(selectedMarker) ||
    Boolean(selectedTechMarker) ||
    technicianPinPanel !== null ||
    adminHqPanelOpen;

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

  const renderTechnicianGpsControls = () => {
    if (!onToggleLocationSharing) return null;
    return (
      <div className="space-y-2 border-t border-border pt-3">
        <div
          className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider ${
            locationSharingEnabled
              ? "border-primary/40 bg-primary/10 text-primary-ink"
              : "border-warning-border bg-warning-surface text-warning-fg"
          }`}
        >
          {locationSharingEnabled
            ? "GPS ativo — a partilhar posição"
            : "GPS pausado — posição oculta no admin"}
        </div>
        <button
          type="button"
          onClick={() => {
            onToggleLocationSharing();
            if (!locationSharingEnabled) closeTechnicianPanels();
          }}
          className={`w-full rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
            locationSharingEnabled
              ? "border border-border bg-card text-foreground hover:bg-muted"
              : "bg-primary text-primary-foreground hover:bg-primary-hover"
          }`}
        >
          {locationSharingEnabled ? "Pausar partilha GPS" : "Ligar GPS de volta"}
        </button>
      </div>
    );
  };

  // Tarefas planeadas atribuídas ao técnico selecionado (apenas para o dia de hoje)
  const techAssignedTasks = useMemo(() => {
    if (!selectedTechMarker) return [];
    const pool = allOpportunities && allOpportunities.length > 0 ? allOpportunities : displayTasks;

    if (selectedTechMarker.technicianId === ONBOARDING_DEMO_TECH_ID) {
      const demo = pool.find((t) => t.id === ONBOARDING_DEMO_TASK_ID);
      if (!demo?.coordinates) return [];
      const when = new Date();
      when.setHours(11, 0, 0, 0);
      return [
        {
          ...demo,
          technician: ONBOARDING_DEMO_TECH_NAME,
          scheduledAt: when,
          dueDate: when,
          hasScheduledTask: true,
        },
      ];
    }

    const norm = (s?: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const techNameNorm = norm(selectedTechMarker.technicianName);
    const today = new Date();

    return pool.filter(t => {
      if (!t.coordinates || !Array.isArray(t.coordinates)) return false;
      const tName = norm(t.technician);
      const matchesName = tName && (tName === techNameNorm || tName.includes(techNameNorm) || techNameNorm.includes(tName));
      const matchesId = t.technicianId && t.technicianId === selectedTechMarker.technicianId;
      if (!matchesName && !matchesId) return false;

      // Filtrar estritamente para tarefas agendadas no dia de hoje
      const rawDate = t.scheduledAt || t.start || t.dueDate;
      if (!rawDate) return false;
      const taskDate = new Date(rawDate);
      if (isNaN(taskDate.getTime())) return false;

      return (
        taskDate.getFullYear() === today.getFullYear() &&
        taskDate.getMonth() === today.getMonth() &&
        taskDate.getDate() === today.getDate()
      );
    }).sort((a, b) => {
      const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : (a.dueDate ? new Date(a.dueDate).getTime() : 0);
      const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : (b.dueDate ? new Date(b.dueDate).getTime() : 0);
      return timeA - timeB;
    });
  }, [selectedTechMarker, allOpportunities, displayTasks]);

  const clusterableTasks = useMemo(() => {
    return displayTasks.filter((task) => {
      if (!task.coordinates || !Array.isArray(task.coordinates)) return false;
      const isStopOfSelectedTech =
        selectedTechMarker &&
        techAssignedTasks.some(
          (st) =>
            (st.id && st.id === task.id) || (st.twentyId && st.twentyId === task.twentyId)
        );
      return !isStopOfSelectedTech;
    });
  }, [displayTasks, selectedTechMarker, techAssignedTasks]);

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
      const isHighlighted = highlightedIds.includes(task.id);
      const isSelected =
        selectedMarker &&
        (selectedMarker.id === task.id ||
          (selectedMarker.twentyId && selectedMarker.twentyId === task.twentyId));
      const isLate = resolveTaskOverdue(task);
      const isUnscheduled =
        isNeedsSchedulingStage(task.stage) && !task.hasScheduledTask;
      const techColor =
        task.technicianColor ||
        getTechnicianColor(task.technician || (task.stage === "Entrada" ? "Unscheduled" : null));
      const alertColor = isLate
        ? "#dc2626"
        : task.delayAlert === "red"
          ? "#ef4444"
          : task.delayAlert === "orange"
            ? "#f59e0b"
            : null;

      const dueTime = task.dueDate
        ? new Date(task.dueDate).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
        : "";

      const marker = new google.maps.Marker({
        position: { lat: task.coordinates[0], lng: task.coordinates[1] },
        icon: buildTaskMarkerIcon(task, {
          isLate,
          isUnscheduled,
          isHighlighted,
          isSelected: Boolean(isSelected),
          alertColor,
          showTechnicianColors: !!showTechnicianColors,
          techColor,
          zoom: markerZoom,
        }),
        title: dueTime
          ? isLate
            ? `Atrasada · ${dueTime} · ${task.title}`
            : `Agendada ${dueTime} · ${task.title}`
          : task.title,
      });

      marker.set("mapHasLate", isLate);

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
  ]);

  const shouldComputeTechLiveRoute = Boolean(
    selectedTechMarker && isLoaded && techAssignedTasks.length > 0
  );
  const shouldComputeOptimizedRoute = Boolean(
    optimizedRoute && optimizedRoute.length > 0 && hqLocation && isLoaded
  );
  const displayTechLiveRouteDirections = shouldComputeTechLiveRoute ? techLiveRouteDirections : null;
  const displayDirectionsResponse = shouldComputeOptimizedRoute ? directionsResponse : null;

  // Calcular trajeto contínuo em tempo real (Posição Atual -> Paragem 1 -> Paragem 2...)
  useEffect(() => {
    if (!shouldComputeTechLiveRoute) return;

    const directionsService = new window.google.maps.DirectionsService();

    if (techAssignedTasks.length === 1) {
      directionsService.route(
        {
          origin: { lat: selectedTechMarker.lat, lng: selectedTechMarker.lng },
          destination: { lat: techAssignedTasks[0].coordinates[0], lng: techAssignedTasks[0].coordinates[1] },
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
      // Rota com múltiplas paragens sequenciais
      const destination = {
        lat: techAssignedTasks[techAssignedTasks.length - 1].coordinates[0],
        lng: techAssignedTasks[techAssignedTasks.length - 1].coordinates[1],
      };
      const waypoints = techAssignedTasks.slice(0, -1).map(t => ({
        location: { lat: t.coordinates[0], lng: t.coordinates[1] },
        stopover: true,
      }));

      directionsService.route(
        {
          origin: { lat: selectedTechMarker.lat, lng: selectedTechMarker.lng },
          destination: destination,
          waypoints: waypoints,
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
  }, [shouldComputeTechLiveRoute, selectedTechMarker, techAssignedTasks, isLoaded]);

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
          origin: origin,
          destination: destination,
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

  if (isTechnicianView && !isOnline) {
    return (
      <TechnicianOfflineMapPanel tasks={displayTasks} onTaskSelect={onTaskSelect} />
    );
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
        onClick={() => {
          closeAllMapPopups();
        }}
        options={googleMapOptions}
      >
        {/* Marcador da Sede (logo da empresa) */}
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
              else if (adminOnboardingMap) setAdminHqPanelOpen(true);
            }}
          />
        )}

        {adminOnboardingMap && adminHqPanelOpen && hqLocation && (
          <InfoWindow
            position={{ lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] }}
            onCloseClick={() => setAdminHqPanelOpen(false)}
          >
            <MapInfoWindowShell onClose={() => setAdminHqPanelOpen(false)}>
              <div data-tour="admin-map-hq-panel">
                <div className="mb-3 flex items-center gap-3">
                  <img src={APP_LOGO_PATH} alt="" className="h-10 w-10 rounded-xl object-contain" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-foreground">
                      {hqLocation.name || MAP_HQ_TITLE}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-primary-ink">Este é o ponto da sede (logo)</p>
                  </div>
                </div>
                <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                  A equipa parte daqui. No mapa vê carrinhas (técnicos), pins de clientes e o pin de formação
                  do guia — tudo fictício, nada vai ao CRM.
                </p>
                {hqLocation.address && (
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{hqLocation.address}</p>
                )}
              </div>
            </MapInfoWindowShell>
          </InfoWindow>
        )}

        {/* Localização do Utilizador (Técnico) */}
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

        {isTechnicianView && technicianPinPanel === "hq" && hqLocation && (
          <InfoWindow
            position={{ lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] }}
            onCloseClick={closeAllMapPopups}
          >
            <MapInfoWindowShell onClose={closeAllMapPopups}>
              <div className="mb-3 flex items-center gap-3">
                <img
                  src={APP_LOGO_PATH}
                  alt=""
                  className="h-10 w-10 rounded-xl object-contain"
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-foreground">
                    {hqLocation.name || MAP_HQ_TITLE}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-muted-foreground">Ponto de partida da equipa</p>
                </div>
              </div>
              {hqLocation.address && (
                <p className="mb-3 text-xs font-medium text-muted-foreground">{hqLocation.address}</p>
              )}
              {renderTechnicianGpsControls()}
              {userLocation && onToggleLocationSharing && (
                <button
                  type="button"
                  onClick={panToUserLocation}
                  className="mt-2 w-full rounded-xl border border-border bg-muted py-2.5 text-xs font-black uppercase tracking-wider text-foreground hover:bg-muted"
                >
                  Ir para a minha posição
                </button>
              )}
            </MapInfoWindowShell>
          </InfoWindow>
        )}

        {isTechnicianView && technicianPinPanel === "user" && userLocation && (
          <InfoWindow
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            onCloseClick={closeAllMapPopups}
          >
            <MapInfoWindowShell onClose={closeAllMapPopups}>
              <p className="text-xs font-black uppercase tracking-wider text-foreground">A sua posição</p>
              {typeof userLocation.accuracy === "number" && (
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Precisão: ~{Math.round(userLocation.accuracy)} m
                </p>
              )}
              {renderTechnicianGpsControls()}
              <button
                type="button"
                onClick={() => {
                  panToUserLocation();
                  closeTechnicianPanels();
                }}
                className="mt-2 w-full rounded-xl border border-border bg-muted py-2.5 text-xs font-black uppercase tracking-wider text-foreground hover:bg-muted"
              >
                Centrar no mapa
              </button>
            </MapInfoWindowShell>
          </InfoWindow>
        )}

        {/* Marcadores dos Técnicos no Terreno (Visão Admin Premium) */}
        {techniciansOnMap && techniciansOnMap.map((tech) => {
          const isDemoTech = tech.technicianId === ONBOARDING_DEMO_TECH_ID;
          const updateAgeMinutes = Math.round((renderNow - new Date(tech.lastUpdate).getTime()) / (60 * 1000));
          const timeLabel = updateAgeMinutes <= 1 ? "Agora mesmo" : `Há ${updateAgeMinutes} min`;
          const isSelectedTech = selectedTechMarker?.technicianId === tech.technicianId;
          const vanSize = getTechnicianVanPixelSize(mapZoomBucket, isSelectedTech);
          const showTechLabel = shouldShowDenseLabels(mapZoomBucket) || isSelectedTech;
          
          // Ícone SVG personalizado de carrinha técnica com glow e contraste
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
              zIndex={isDemoTech ? 1200 : undefined}
              onClick={() => {
                setAdminHqPanelOpen(false);
                setSelectedTechMarker(tech);
                if (onTechnicianSelect) onTechnicianSelect(tech);
              }}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(vanSvg)}`,
                scaledSize: new window.google.maps.Size(vanSize, vanSize),
                anchor: new window.google.maps.Point(vanSize / 2, vanSize / 2),
              }}
              label={
                showTechLabel
                  ? {
                      text: `🚗 ${tech.technicianName || 'Técnico'}`,
                      className:
                        'bg-ink text-neon text-xs font-black px-2.5 py-1 rounded-full border border-border shadow-xl font-sans whitespace-nowrap',
                      color: '#84cc16',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }
                  : undefined
              }
              title={`Técnico: ${tech.technicianName} (${timeLabel})`}
            />
          );
        })}
        {/* Marcadores Numerados das Paragens Planeadas do Técnico (1, 2, 3...) */}
        {selectedTechMarker && techAssignedTasks.map((stop, idx) => {
          if (!stop.coordinates || !Array.isArray(stop.coordinates)) return null;

          const taskStatus = stop.status || stop.taskStatus;
          const normStatus = (taskStatus || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const isDone = isTaskCompleted(taskStatus);
          const isInc = normStatus === "INCOMPLETO";
          const isCanc = normStatus === "CANCELADO";
          const isLate = !isDone && !isInc && !isCanc && resolveTaskOverdue(stop);

          const pinColor = isDone
            ? "#10b981"
            : isInc
              ? "#f59e0b"
              : isCanc
                ? "#ef4444"
                : "#0284c7";
          const symbolText = isDone ? "✓" : isCanc ? "✕" : `${idx + 1}`;

          const stopWidth = getRouteStopPixelSize(mapZoomBucket);
          const stopHeight = Math.round(stopWidth * (MAP_PIN_VIEW_HEIGHT / MAP_PIN_VIEW_WIDTH));
          const stopSvg = buildRouteStopTeardropSvg({
            pinColor,
            label: symbolText,
            isLate,
            width: stopWidth,
          });

          const statusTitle = isDone ? "Concluído" : (isInc ? "Incompleto" : (isCanc ? "Cancelado" : (isLate ? "Atrasada" : "Pendente")));

          return (
            <Marker
              key={`tech-stop-${stop.id || stop.twentyId || idx}`}
              position={{ lat: stop.coordinates[0], lng: stop.coordinates[1] }}
              zIndex={999}
              onClick={() => onTaskSelect(stop)}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(stopSvg)}`,
                scaledSize: new window.google.maps.Size(stopWidth, stopHeight),
                anchor: teardropAnchor(stopWidth, stopHeight),
              }}
              title={`Paragem #${idx + 1} (${statusTitle}): ${stop.client || stop.title}`}
            />
          );
        })}

        {/* InfoWindow do Técnico Selecionado com Itinerário Planeado */}
        {selectedTechMarker && (() => {
          const pool = allOpportunities && allOpportunities.length > 0 ? allOpportunities : displayTasks;
          
          // Tarefas por agendar para sugestão se o técnico estiver livre
          const unscheduledTasks = pool.filter(t => {
            if (!t.coordinates || !Array.isArray(t.coordinates)) return false;
            return isNeedsSchedulingStage(t.stage) && !t.hasScheduledTask;
          });

          const getDistKm = (coords: [number, number]) => {
            return Math.sqrt(
              Math.pow(coords[0] - selectedTechMarker.lat, 2) + 
              Math.pow(coords[1] - selectedTechMarker.lng, 2)
            ) * 111;
          };

          let closestUnscheduled: any = null;
          let minUnscheduledDist = Infinity;
          for (const u of unscheduledTasks) {
            const d = getDistKm(u.coordinates);
            if (d < minUnscheduledDist) {
              minUnscheduledDist = d;
              closestUnscheduled = u;
            }
          }

          return (
            <InfoWindow
              position={{ lat: selectedTechMarker.lat, lng: selectedTechMarker.lng }}
              onCloseClick={() => setSelectedTechMarker(null)}
            >
              <MapInfoWindowShell onClose={() => setSelectedTechMarker(null)} wide>
                <div
                  data-tour={
                    selectedTechMarker.technicianId === ONBOARDING_DEMO_TECH_ID
                      ? "admin-map-demo-tech-panel"
                      : undefined
                  }
                >
                {/* Header Técnico */}
                <div className="flex items-center justify-between border-b border-border pb-1.5 mb-2">
                  <div>
                    <div className="font-black text-foreground text-sm">{selectedTechMarker.technicianName}</div>
                    <div className="text-xs text-muted-foreground font-medium">Em Campo • Ativo</div>
                  </div>
                  <span className="bg-info-surface text-info-fg text-xs font-black px-2 py-0.5 rounded-full border border-info-border">
                    {techAssignedTasks.length} {techAssignedTasks.length === 1 ? "visita hoje" : "visitas hoje"}
                  </span>
                </div>

                {/* Cenário A: Técnico tem Visitas Agendadas */}
                {techAssignedTasks.length > 0 ? (
                  <div className="space-y-1.5 mb-1">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Itinerário de Hoje</div>
                    <div className="max-h-[190px] overflow-y-auto space-y-1.5 pr-1">
                      {techAssignedTasks.map((t, i) => {
                        const distFromTech = getDistKm(t.coordinates);
                        const distFormatted = (Math.round(distFromTech * 10) / 10).toFixed(1);
                        const estMin = Math.max(2, Math.round((distFromTech / 40) * 60));

                        const taskStatus = t.status || t.taskStatus;
                        const normStatus = (taskStatus || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        const isDone = isTaskCompleted(taskStatus);
                        const isInc = normStatus === "INCOMPLETO";
                        const isCanc = normStatus === "CANCELADO";
                        const isLate = !isDone && !isInc && !isCanc && resolveTaskOverdue(t);

                        return (
                          <div
                            key={t.id || t.twentyId || i}
                            onClick={() => onTaskSelect(t)}
                            className={`p-2 rounded-xl border cursor-pointer transition-all ${
                              isDone 
                                ? "bg-success-surface/70 border-success-border hover:bg-success-surface/70"
                                : isInc
                                ? "bg-warning-surface/70 border-warning-border hover:bg-warning-surface/70"
                                : isCanc
                                ? "bg-danger-surface/70 border-danger-border hover:bg-danger-surface/70 opacity-75"
                                : isLate
                                ? "bg-warning-surface border-warning-border hover:bg-warning-surface ring-1 ring-warning-border/50"
                                : "bg-muted border-border hover:bg-muted"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <span className={`w-4 h-4 rounded-full text-ink-foreground text-xs flex items-center justify-center font-black ${
                                  isDone ? "bg-success-solid" : isInc ? "bg-warning-solid" : isCanc ? "bg-danger-solid" : "bg-info"
                                }`}>
                                  {isDone ? "✓" : isCanc ? "✕" : (i + 1)}
                                </span>
                                <span className="truncate max-w-[130px]">{t.client || t.title}</span>
                              </span>

                              {isLate && (
                                <span className="text-xs font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-warning-surface text-warning-fg border border-warning-border">
                                  Atrasada
                                </span>
                              )}

                              {/* Badge de Estado */}
                              <span className={`text-xs font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                isDone 
                                  ? "bg-success-surface text-success-fg" 
                                  : isInc 
                                  ? "bg-warning-surface text-warning-fg" 
                                  : isCanc 
                                  ? "bg-danger-surface text-danger-fg" 
                                  : "bg-info-surface text-info-fg"
                              }`}>
                                {isDone ? "Concluído" : isInc ? "Incompleto" : isCanc ? "Cancelado" : "Pendente"}
                              </span>
                            </div>

                            <div className="text-xs text-muted-foreground truncate mt-0.5 pl-5.5">{t.address}</div>

                            {/* Motivo/Observações se não concluído */}
                            {(isInc || isCanc || isDone) && t.report && (
                              <div className={`text-xs font-medium mt-1 pl-5.5 rounded px-1.5 py-0.5 ${
                                isDone ? "bg-success-surface/50 text-success-fg" : isInc ? "bg-warning-surface/70 text-warning-fg" : "bg-danger-surface/70 text-danger-fg"
                              }`}>
                                <strong>Nota:</strong> {t.report}
                              </div>
                            )}

                            {!isDone && !isCanc && i === 0 && (
                              <div className="text-xs font-bold text-info mt-1 pl-5.5 flex items-center gap-1">
                                <span>Distância atual: ~{distFormatted} km (~{estMin} min)</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Cenário B: Técnico Livre */
                  <div className="space-y-2 mb-1">
                    <div className="bg-muted p-2 rounded-xl border border-border text-muted-foreground text-xs">
                      Sem visitas agendadas para hoje.
                    </div>

                    {closestUnscheduled && (
                      <div className="bg-success-surface/80 p-2 rounded-xl border border-success-border">
                        <div className="text-xs font-bold text-success-fg uppercase tracking-wider">Obra por agendar mais próxima</div>
                        <div className="font-bold text-foreground text-xs mt-0.5 truncate">{closestUnscheduled.title || closestUnscheduled.client}</div>
                        <div className="text-xs text-muted-foreground truncate">{closestUnscheduled.address}</div>
                        <div className="text-xs font-bold text-success-fg mt-1">A ~{(Math.round(minUnscheduledDist * 10) / 10).toFixed(1)} km do técnico</div>
                        
                        <button
                          onClick={() => onTaskSelect(closestUnscheduled)}
                          className="w-full mt-2 bg-ink text-neon hover:bg-ink/90 text-xs font-bold uppercase tracking-wider py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 border border-border"
                        >
                          Agendar para este Técnico
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {selectedTechMarker.technicianId === ONBOARDING_DEMO_TECH_ID && (
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-muted-foreground">
                    No guia, a carrinha verde aproxima-se do pin de formação — como se o técnico estivesse a caminho
                    do cliente exemplo.
                  </p>
                )}
                </div>
              </MapInfoWindowShell>
            </InfoWindow>
          );
        })()}

        {/* Marcadores das Tarefas Gerais */}
        {!useTaskClustering && displayTasks.map((task) => {
          // Se este técnico estiver selecionado e esta tarefa for uma das suas paragens numeradas,
          // não renderizar o marcador genérico para evitar duplicados ou confusão visual
          const isStopOfSelectedTech = selectedTechMarker && techAssignedTasks.some(st => (st.id && st.id === task.id) || (st.twentyId && st.twentyId === task.twentyId));
          if (isStopOfSelectedTech) return null;

          const isHighlighted = highlightedIds.includes(task.id);
          const isSelected =
            selectedMarker &&
            (selectedMarker.id === task.id ||
              (selectedMarker.twentyId && selectedMarker.twentyId === task.twentyId));
          const isLate = resolveTaskOverdue(task);
          const isUnscheduled =
            isNeedsSchedulingStage(task.stage) && !task.hasScheduledTask;
          const techColor = task.technicianColor || getTechnicianColor(task.technician || (task.stage === "Entrada" ? "Unscheduled" : null));
          const alertColor = isLate
            ? "#dc2626"
            : task.delayAlert === "red"
              ? "#ef4444"
              : task.delayAlert === "orange"
                ? "#f59e0b"
                : null;
          
          if (!task.coordinates) return null;

          const dueTime = task.dueDate
            ? new Date(task.dueDate).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
            : "";

          return (
            <Marker
              key={task.id}
              position={{ lat: task.coordinates[0], lng: task.coordinates[1] }}
              onClick={() => {
                setSelectedMarker(task);
                if (!useMarkerPopup) {
                  onTaskSelect(task);
                }
              }}
              icon={buildTaskMarkerIcon(task, {
                isLate,
                isUnscheduled,
                isHighlighted,
                isSelected: Boolean(isSelected),
                alertColor,
                showTechnicianColors: !!showTechnicianColors,
                techColor,
                zoom: mapZoomBucket,
              })}
              title={
                dueTime
                  ? isLate
                    ? `Atrasada · ${dueTime} · ${task.title}`
                    : `Agendada ${dueTime} · ${task.title}`
                  : task.title
              }
            />
          );
        })}

        {/* InfoWindow — técnico (popup compacto) */}
        {selectedMarker && isTechnicianView && useMarkerPopup && selectedMarker.coordinates && (
          <InfoWindow
            position={{ lat: selectedMarker.coordinates[0], lng: selectedMarker.coordinates[1] }}
            onCloseClick={() => setSelectedMarker(null)}
            options={{ maxWidth: 300 }}
          >
            <TaskMapInfoWindow
              task={selectedMarker}
              onClose={() => setSelectedMarker(null)}
              allowOpenOnboardingDemo={
                onboardingMapTourId === "technician" && onboardingDemoActive
              }
              onOpenVisit={() => {
                onTaskSelect(selectedMarker);
                setSelectedMarker(null);
              }}
            />
          </InfoWindow>
        )}

        {/* InfoWindow — painel admin (serviço no mapa) */}
        {selectedMarker && !isTechnicianView && useMarkerPopup && selectedMarker.coordinates && (
          <InfoWindow
            position={{ lat: selectedMarker.coordinates[0], lng: selectedMarker.coordinates[1] }}
            onCloseClick={() => setSelectedMarker(null)}
            options={{ maxWidth: 300 }}
          >
            <MapMarkerInfoWindow
              marker={selectedMarker}
              onClose={() => setSelectedMarker(null)}
              allowOpenOnboardingDemo={
                onboardingMapTourId === "admin" && onboardingDemoActive
              }
              onOpenDetails={() => {
                onTaskSelect(selectedMarker);
                setSelectedMarker(null);
              }}
              onSchedule={
                onScheduleFromMap
                  ? () => {
                      onScheduleFromMap(selectedMarker);
                      setSelectedMarker(null);
                    }
                  : undefined
              }
              routeSelectionMode={routeSelectionMode}
              isInRoute={isTaskInRoute ? isTaskInRoute(selectedMarker) : false}
              onToggleRoute={
                onToggleRouteFromMap
                  ? () => {
                      onToggleRouteFromMap(selectedMarker);
                    }
                  : undefined
              }
            />
          </InfoWindow>
        )}

        {/* InfoWindow legado (sem popup admin) */}
        {selectedMarker && !isTechnicianView && !useMarkerPopup && selectedMarker.coordinates && (
          <InfoWindow
            position={{ lat: selectedMarker.coordinates[0], lng: selectedMarker.coordinates[1] }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <MapInfoWindowShell onClose={() => setSelectedMarker(null)}>
              <div className="flex justify-between items-start gap-2">
                <div className="font-bold text-foreground text-sm">{selectedMarker.title}</div>
                <div className="bg-muted text-xs font-black px-1.5 py-0.5 rounded text-muted-foreground uppercase shrink-0">
                  #{selectedMarker.nsi}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2">{selectedMarker.company || selectedMarker.client}</div>
              <button
                type="button"
                onClick={() => onTaskSelect(selectedMarker)}
                className="w-full bg-info-solid hover:bg-info-solid/90 text-ink-foreground text-xs font-black uppercase tracking-wider py-1.5 px-2 rounded-xl transition-all shadow-sm"
              >
                Ver detalhes
              </button>
            </MapInfoWindowShell>
          </InfoWindow>
        )}

        {/* Renderização do Trajeto em Tempo Real do Técnico Selecionado */}
        {displayTechLiveRouteDirections && (
          <DirectionsRenderer
            directions={displayTechLiveRouteDirections}
            options={{
              polylineOptions: {
                strokeColor: "#0284c7",
                strokeOpacity: 0.9,
                strokeWeight: 6,
              },
              suppressMarkers: true
            }}
          />
        )}

        {/* Renderização da Rota Otimizada de Agendamento */}
        {displayDirectionsResponse && (
          <DirectionsRenderer
            directions={displayDirectionsResponse}
            options={{
              polylineOptions: {
                strokeColor: "#2563eb",
                strokeOpacity: 0.8,
                strokeWeight: 5
              },
              suppressMarkers: true
            }}
          />
        )}
      </GoogleMap>

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
      />
      <MapLegend
        open={legendOpen}
        onClose={() => setLegendOpen(false)}
        variant={overlayVariant}
      />

      {/* Overlay de Info de Rota */}
      {displayDirectionsResponse && optimizedRoute && (
        <div className="absolute bottom-6 left-6 bg-ink/95 backdrop-blur shadow-2xl rounded-2xl p-4 border border-border-strong z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 text-ink-foreground">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-success-solid p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <div className="text-xs font-bold text-success-solid uppercase tracking-wider">Tempo total (Google Maps)</div>
              <div className="text-xl font-black text-ink-foreground">
                {(() => {
                  const totalSecs = displayDirectionsResponse.routes[0].legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0);
                  return totalSecs / 60 > 60 
                    ? `${Math.floor(totalSecs / 3600)}h ${Math.round((totalSecs % 3600) / 60)}min`
                    : `${Math.round(totalSecs / 60)} min`;
                })()}
              </div>
            </div>
          </div>
          <div className="flex gap-4 border-t border-border pt-2">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase">Distância</div>
              <div className="text-sm font-bold text-muted-foreground">
                {(displayDirectionsResponse.routes[0].legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0) / 1000).toFixed(1)} km
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase">Custo Combustível</div>
              <div className="text-sm font-bold text-success-solid">
                {((displayDirectionsResponse.routes[0].legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0) / 1000) * (fuelConsumption / 100) * fuelPrice).toFixed(2)}€
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
