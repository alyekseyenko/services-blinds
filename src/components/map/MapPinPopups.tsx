"use client";

import { InfoWindow } from "@react-google-maps/api";
import { APP_LOGO_PATH, MAP_HQ_TITLE } from "@/lib/branding";
import { MapInfoWindowShell } from "@/components/map/MapInfoWindowShell";
import { TaskMapInfoWindow } from "@/components/map/TaskMapInfoWindow";
import { MapMarkerInfoWindow } from "@/components/map/MapMarkerInfoWindow";

function TechnicianGpsControls(props: {
  locationSharingEnabled: boolean;
  onToggleLocationSharing?: () => void;
  onAcceptToggle?: () => void;
}) {
  const { locationSharingEnabled, onToggleLocationSharing, onAcceptToggle } = props;
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
          if (!locationSharingEnabled) onAcceptToggle?.();
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
}

export function MapPinPopups(props: {
  isTechnicianView: boolean;
  useMarkerPopup: boolean;
  technicianPinPanel: "hq" | "user" | null;
  hqLocation: {
    coordinates: [number, number];
    name?: string;
    address?: string;
  } | null;
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
  locationSharingEnabled: boolean;
  onToggleLocationSharing?: () => void;
  onCloseAll: () => void;
  onCloseTechnicianPanels: () => void;
  onPanToUser: () => void;
  technicianDayStops: any[];
  showOwnDayRoute: boolean;
  onToggleOwnDayRoute: () => void;
  selectedMarker: any | null;
  onClearSelectedMarker: () => void;
  onTaskSelect: (task: any) => void;
  onScheduleFromMap?: (task: any) => void;
  routeSelectionMode?: boolean;
  isTaskInRoute?: (task: any) => boolean;
  onToggleRouteFromMap?: (task: any) => void;
}) {
  const {
    isTechnicianView,
    useMarkerPopup,
    technicianPinPanel,
    hqLocation,
    userLocation,
    locationSharingEnabled,
    onToggleLocationSharing,
    onCloseAll,
    onCloseTechnicianPanels,
    onPanToUser,
    technicianDayStops,
    showOwnDayRoute,
    onToggleOwnDayRoute,
    selectedMarker,
    onClearSelectedMarker,
    onTaskSelect,
    onScheduleFromMap,
    routeSelectionMode,
    isTaskInRoute,
    onToggleRouteFromMap,
  } = props;

  return (
    <>
      {isTechnicianView && technicianPinPanel === "hq" && hqLocation && (
        <InfoWindow
          position={{ lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] }}
          onCloseClick={onCloseAll}
        >
          <MapInfoWindowShell onClose={onCloseAll}>
            <div className="mb-3 flex items-center gap-3">
              <img src={APP_LOGO_PATH} alt="" className="h-10 w-10 rounded-xl object-contain" />
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
            <TechnicianGpsControls
              locationSharingEnabled={locationSharingEnabled}
              onToggleLocationSharing={onToggleLocationSharing}
              onAcceptToggle={onCloseTechnicianPanels}
            />
            {userLocation && onToggleLocationSharing && (
              <button
                type="button"
                onClick={onPanToUser}
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
          onCloseClick={onCloseAll}
        >
          <MapInfoWindowShell onClose={onCloseAll}>
            <p className="text-xs font-black uppercase tracking-wider text-foreground">A sua posição</p>
            {typeof userLocation.accuracy === "number" && (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Precisão: ~{Math.round(userLocation.accuracy)} m
              </p>
            )}
            <TechnicianGpsControls
              locationSharingEnabled={locationSharingEnabled}
              onToggleLocationSharing={onToggleLocationSharing}
              onAcceptToggle={onCloseTechnicianPanels}
            />
            <button
              type="button"
              onClick={() => {
                if (technicianDayStops.length === 0) return;
                onToggleOwnDayRoute();
                onCloseTechnicianPanels();
              }}
              disabled={technicianDayStops.length === 0}
              className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-2 text-xs font-black uppercase tracking-wider text-primary-foreground disabled:opacity-50"
            >
              {technicianDayStops.length === 0
                ? "Sem paragens neste dia"
                : showOwnDayRoute
                  ? "Esconder rota do dia"
                  : "Ver rota de hoje"}
            </button>
            <button
              type="button"
              onClick={() => {
                onPanToUser();
                onCloseTechnicianPanels();
              }}
              className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-muted px-2 text-xs font-black uppercase tracking-wider text-foreground hover:bg-muted"
            >
              Centrar no mapa
            </button>
          </MapInfoWindowShell>
        </InfoWindow>
      )}

      {selectedMarker && isTechnicianView && useMarkerPopup && selectedMarker.coordinates && (
        <InfoWindow
          position={{ lat: selectedMarker.coordinates[0], lng: selectedMarker.coordinates[1] }}
          onCloseClick={onClearSelectedMarker}
          options={{ maxWidth: 300 }}
        >
          <TaskMapInfoWindow
            task={selectedMarker}
            onClose={onClearSelectedMarker}
            onOpenVisit={() => {
              onTaskSelect(selectedMarker);
              onClearSelectedMarker();
            }}
          />
        </InfoWindow>
      )}

      {selectedMarker && !isTechnicianView && useMarkerPopup && selectedMarker.coordinates && (
        <InfoWindow
          position={{ lat: selectedMarker.coordinates[0], lng: selectedMarker.coordinates[1] }}
          onCloseClick={onClearSelectedMarker}
          options={{ maxWidth: 300 }}
        >
          <MapMarkerInfoWindow
            marker={selectedMarker}
            onClose={onClearSelectedMarker}
            onOpenDetails={() => {
              onTaskSelect(selectedMarker);
              onClearSelectedMarker();
            }}
            onSchedule={
              onScheduleFromMap
                ? () => {
                    onScheduleFromMap(selectedMarker);
                    onClearSelectedMarker();
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

      {selectedMarker && !isTechnicianView && !useMarkerPopup && selectedMarker.coordinates && (
        <InfoWindow
          position={{ lat: selectedMarker.coordinates[0], lng: selectedMarker.coordinates[1] }}
          onCloseClick={onClearSelectedMarker}
        >
          <MapInfoWindowShell onClose={onClearSelectedMarker}>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente</div>
                <div className="font-bold text-foreground text-sm">
                  {[selectedMarker.client, selectedMarker.company].find(
                    (value) => value?.trim() && value.trim() !== "Cliente"
                  ) || selectedMarker.title}
                </div>
              </div>
              <div className="bg-muted text-xs font-black px-1.5 py-0.5 rounded text-muted-foreground uppercase shrink-0">
                {selectedMarker.serviceNumber
                  ? `N.º ${selectedMarker.serviceNumber}`
                  : `#${selectedMarker.nsi}`}
              </div>
            </div>
            {selectedMarker.title &&
            selectedMarker.title !== selectedMarker.client &&
            selectedMarker.client &&
            selectedMarker.client !== "Cliente" ? (
              <div className="text-xs text-muted-foreground mb-2">{selectedMarker.title}</div>
            ) : null}
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
    </>
  );
}