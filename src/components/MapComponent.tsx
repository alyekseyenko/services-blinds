"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { getServiceTypeColor } from '@/lib/techniciansConfig';
import { resolveTaskOverdue } from '@/lib/taskUtils';
import { HQ_LAT, HQ_LNG } from '@/lib/hq';

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

function getServiceColor(task: any): string | null {
  if (task.tipoDeServico && task.tipoDeServico.length > 0) {
    const type = task.tipoDeServico[0];
    return getServiceTypeColor(type).pin;
  }
  return null;
}

interface MapComponentProps {
  tasks: any[];
  allOpportunities?: any[];
  onTaskSelect: (task: any) => void;
  showTechnicianColors?: boolean;
  highlightedIds?: string[];
  hqLocation?: { coordinates: [number, number] } | null;
  optimizedRoute?: any[] | null;
  fuelPrice?: number;
  fuelConsumption?: number;
  onRouteUpdate?: (routeData: any) => void;
  userLocation?: { lat: number; lng: number } | null;
  isTechnicianView?: boolean;
  techniciansLocations?: Array<{
    technicianId: string;
    technicianName: string;
    lat: number;
    lng: number;
    lastUpdate: string;
    accuracy?: number;
  }>;
  onTechnicianSelect?: (tech: any) => void;
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
  techniciansLocations = [],
  onTechnicianSelect
}: MapComponentProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const [selectedTechMarker, setSelectedTechMarker] = useState<any | null>(null);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [techLiveRouteDirections, setTechLiveRouteDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | null>(null);

  const center = useMemo(() => {
    if (hqLocation && hqLocation.coordinates) {
      return { lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] };
    }
    const firstTask = tasks.find(t => t.coordinates && Array.isArray(t.coordinates));
    if (firstTask) {
      return { lat: firstTask.coordinates[0], lng: firstTask.coordinates[1] };
    }
    return { lat: HQ_LAT, lng: HQ_LNG };
  }, [hqLocation, tasks]);

  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);

  // Inicializar o centro do mapa uma vez no carregamento
  useEffect(() => {
    if (!mapCenter && center) {
      setMapCenter(center);
    }
  }, [center, mapCenter]);

  // Centralizar dinamicamente na localização do técnico APENAS na primeira vez que estiver disponível
  useEffect(() => {
    if (userLocation && map && !hasCenteredOnUser) {
      const coords = { lat: userLocation.lat, lng: userLocation.lng };
      setMapCenter(coords);
      map.panTo(coords);
      setHasCenteredOnUser(true);
    }
  }, [userLocation, map, hasCenteredOnUser]);

  // Centralizar na tarefa selecionada
  useEffect(() => {
    if (selectedMarker && selectedMarker.coordinates && map) {
      const coords = { lat: selectedMarker.coordinates[0], lng: selectedMarker.coordinates[1] };
      setMapCenter(coords);
      map.panTo(coords);
    }
  }, [selectedMarker, map]);

  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(null);
  }, []);

  const onMapIdle = useCallback(() => {
    if (map) {
      const c = map.getCenter();
      if (c) {
        setMapCenter({ lat: c.lat(), lng: c.lng() });
      }
    }
  }, [map]);


  // Tarefas planeadas atribuídas ao técnico selecionado (apenas para o dia de hoje)
  const techAssignedTasks = useMemo(() => {
    if (!selectedTechMarker) return [];
    const pool = allOpportunities && allOpportunities.length > 0 ? allOpportunities : tasks;
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
  }, [selectedTechMarker, allOpportunities, tasks]);

  // Calcular trajeto contínuo em tempo real (Posição Atual -> Paragem 1 -> Paragem 2...)
  useEffect(() => {
    if (!selectedTechMarker || !isLoaded || techAssignedTasks.length === 0) {
      setTechLiveRouteDirections(null);
      return;
    }

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
  }, [selectedTechMarker, techAssignedTasks, isLoaded]);

  useEffect(() => {
    if (!optimizedRoute || optimizedRoute.length === 0 || !hqLocation || !isLoaded) {
      setDirectionsResponse(null);
      onRouteUpdate(null);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    
    const origin = { lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] };
    const destination = { lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] };

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        waypoints: optimizedRoute.map(step => ({
          location: { lat: step.coordinates[0], lng: step.coordinates[1] },
          stopover: true
        })),
        optimizeWaypoints: false,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
          
          const totalDistance = result.routes[0].legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0) / 1000;
          const totalDuration = result.routes[0].legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0) / 60;
          
          const hasTolls = result.routes[0].warnings.some(w => 
            w.toLowerCase().includes('toll') || 
            w.toLowerCase().includes('portagem') || 
            w.toLowerCase().includes('pago')
          );
          
          onRouteUpdate({
            distanceKm: totalDistance,
            durationMin: Math.round(totalDuration),
            hasTolls
          });
        } else {
          console.error(`error fetching directions ${status}`);
        }
      }
    );
  }, [optimizedRoute, hqLocation, isLoaded]);

  if (!isLoaded) return <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white">Carregando Google Maps...</div>;

  return (
    <div className="h-full w-full relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter || center}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={onMapIdle}
        onClick={() => setSelectedTechMarker(null)}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        }}
      >
        {/* Marcador da Sede */}
        {hqLocation && (
          <Marker
            position={{ lat: hqLocation.coordinates[0], lng: hqLocation.coordinates[1] }}
            icon={{
              path: "M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z",
              fillColor: "#1e293b",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#ffffff",
              scale: 1.5,
              anchor: new window.google.maps.Point(12, 12)
            }}
            title="Headquarters"
          />
        )}

        {/* Localização do Utilizador (Técnico) */}
        {userLocation && (
          <Marker
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: "#10b981",
              fillOpacity: 1,
              strokeWeight: 4,
              strokeColor: "#ffffff",
              scale: 7,
            }}
            title="Minha Localização"
          />
        )}

        {/* Marcadores dos Técnicos no Terreno (Visão Admin Premium) */}
        {techniciansLocations && techniciansLocations.map((tech) => {
          const updateAgeMinutes = Math.round((Date.now() - new Date(tech.lastUpdate).getTime()) / (60 * 1000));
          const timeLabel = updateAgeMinutes <= 1 ? "Agora mesmo" : `Há ${updateAgeMinutes} min`;
          
          // Ícone SVG personalizado de carrinha técnica com glow e contraste
          const vanSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
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
              onClick={() => {
                setSelectedTechMarker(tech);
                if (onTechnicianSelect) onTechnicianSelect(tech);
              }}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(vanSvg)}`,
                scaledSize: new window.google.maps.Size(40, 40),
                anchor: new window.google.maps.Point(20, 20),
              }}
              label={{
                text: `🚗 ${tech.technicianName || 'Técnico'}`,
                className: 'bg-[#090d16] text-[#84cc16] text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-700 shadow-xl font-sans whitespace-nowrap',
                color: '#84cc16',
                fontSize: '10px',
                fontWeight: 'bold'
              }}
              title={`Técnico: ${tech.technicianName} (${timeLabel})`}
            />
          );
        })}
        {/* Marcadores Numerados das Paragens Planeadas do Técnico (1, 2, 3...) */}
        {selectedTechMarker && techAssignedTasks.map((stop, idx) => {
          if (!stop.coordinates || !Array.isArray(stop.coordinates)) return null;

          const normStatus = (stop.status || stop.taskStatus || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const isDone = normStatus === "CONCLUIDO" || normStatus === "DONE";
          const isInc = normStatus === "INCOMPLETO";
          const isCanc = normStatus === "CANCELADO";
          const isLate = !isDone && !isInc && !isCanc && resolveTaskOverdue(stop);

          const pinColor = isDone ? "#10b981" : (isInc ? "#f59e0b" : (isCanc ? "#ef4444" : (isLate ? "#f59e0b" : "#0284c7")));
          const symbolText = isDone ? "✓" : (isCanc ? "✕" : `${idx + 1}`);

          const stopSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
            <circle cx="17" cy="17" r="14" fill="${pinColor}" stroke="${isLate ? "#dc2626" : "#ffffff"}" stroke-width="${isLate ? "3.5" : "2.5"}"/>
            <text x="17" y="${isDone || isCanc ? '21' : '22'}" font-family="Arial, sans-serif" font-size="${isDone || isCanc ? '15' : '14'}" font-weight="900" fill="#ffffff" text-anchor="middle">${symbolText}</text>
          </svg>`;

          const statusTitle = isDone ? "Concluído" : (isInc ? "Incompleto" : (isCanc ? "Cancelado" : (isLate ? "Atrasada" : "Pendente")));

          return (
            <Marker
              key={`tech-stop-${stop.id || stop.twentyId || idx}`}
              position={{ lat: stop.coordinates[0], lng: stop.coordinates[1] }}
              zIndex={999}
              onClick={() => onTaskSelect(stop)}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(stopSvg)}`,
                scaledSize: new window.google.maps.Size(34, 34),
                anchor: new window.google.maps.Point(17, 17),
              }}
              title={`Paragem #${idx + 1} (${statusTitle}): ${stop.client || stop.title}`}
            />
          );
        })}

        {/* InfoWindow do Técnico Selecionado com Itinerário Planeado */}
        {selectedTechMarker && (() => {
          const pool = allOpportunities && allOpportunities.length > 0 ? allOpportunities : tasks;
          
          // Tarefas por agendar para sugestão se o técnico estiver livre
          const unscheduledTasks = pool.filter(t => {
            if (!t.coordinates || !Array.isArray(t.coordinates)) return false;
            const stageUpper = (t.stage || "").toUpperCase();
            return ["ENTRADA", "TIRAR_MEDIDAS", "MARCAR_INSTALACAO", "AGENDAR_INSTALACAO"].includes(stageUpper) && !t.hasScheduledTask;
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
              <div className="p-2 max-w-[310px] font-sans">
                {/* Header Técnico */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                  <div>
                    <div className="font-black text-slate-900 text-sm">{selectedTechMarker.technicianName}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Em Campo • Ativo</div>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-200">
                    {techAssignedTasks.length} {techAssignedTasks.length === 1 ? "visita hoje" : "visitas hoje"}
                  </span>
                </div>

                {/* Cenário A: Técnico tem Visitas Agendadas */}
                {techAssignedTasks.length > 0 ? (
                  <div className="space-y-1.5 mb-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Itinerário de Hoje</div>
                    <div className="max-h-[190px] overflow-y-auto space-y-1.5 pr-1">
                      {techAssignedTasks.map((t, i) => {
                        const distFromTech = getDistKm(t.coordinates);
                        const distFormatted = (Math.round(distFromTech * 10) / 10).toFixed(1);
                        const estMin = Math.max(2, Math.round((distFromTech / 40) * 60));

                        const normStatus = (t.status || t.taskStatus || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        const isDone = normStatus === "CONCLUIDO" || normStatus === "DONE";
                        const isInc = normStatus === "INCOMPLETO";
                        const isCanc = normStatus === "CANCELADO";
                        const isLate = !isDone && !isInc && !isCanc && resolveTaskOverdue(t);

                        return (
                          <div
                            key={t.id || t.twentyId || i}
                            onClick={() => onTaskSelect(t)}
                            className={`p-2 rounded-xl border cursor-pointer transition-all ${
                              isDone 
                                ? "bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70"
                                : isInc
                                ? "bg-amber-50/70 border-amber-200 hover:bg-amber-100/70"
                                : isCanc
                                ? "bg-red-50/70 border-red-200 hover:bg-red-100/70 opacity-75"
                                : isLate
                                ? "bg-amber-50 border-amber-300 hover:bg-amber-100 ring-1 ring-amber-400/50"
                                : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <span className={`w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-black ${
                                  isDone ? "bg-emerald-600" : isInc ? "bg-amber-500" : isCanc ? "bg-red-600" : "bg-[#0284c7]"
                                }`}>
                                  {isDone ? "✓" : isCanc ? "✕" : (i + 1)}
                                </span>
                                <span className="truncate max-w-[130px]">{t.client || t.title}</span>
                              </span>

                              {isLate && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-400">
                                  Atrasada
                                </span>
                              )}

                              {/* Badge de Estado */}
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                isDone 
                                  ? "bg-emerald-200 text-emerald-900" 
                                  : isInc 
                                  ? "bg-amber-200 text-amber-900" 
                                  : isCanc 
                                  ? "bg-red-200 text-red-900" 
                                  : "bg-blue-100 text-blue-800"
                              }`}>
                                {isDone ? "Concluído" : isInc ? "Incompleto" : isCanc ? "Cancelado" : "Pendente"}
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-500 truncate mt-0.5 pl-5.5">{t.address}</div>

                            {/* Motivo/Observações se não concluído */}
                            {(isInc || isCanc || isDone) && t.report && (
                              <div className={`text-[10px] font-medium mt-1 pl-5.5 rounded px-1.5 py-0.5 ${
                                isDone ? "bg-emerald-100/50 text-emerald-800" : isInc ? "bg-amber-100/70 text-amber-800" : "bg-red-100/70 text-red-800"
                              }`}>
                                <strong>Nota:</strong> {t.report}
                              </div>
                            )}

                            {!isDone && !isCanc && i === 0 && (
                              <div className="text-[10px] font-bold text-[#0284c7] mt-1 pl-5.5 flex items-center gap-1">
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
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-slate-600 text-xs">
                      Sem visitas agendadas para hoje.
                    </div>

                    {closestUnscheduled && (
                      <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                        <div className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">Obra por agendar mais próxima</div>
                        <div className="font-bold text-slate-900 text-xs mt-0.5 truncate">{closestUnscheduled.title || closestUnscheduled.client}</div>
                        <div className="text-[10px] text-slate-600 truncate">{closestUnscheduled.address}</div>
                        <div className="text-[10px] font-bold text-emerald-700 mt-1">A ~{(Math.round(minUnscheduledDist * 10) / 10).toFixed(1)} km do técnico</div>
                        
                        <button
                          onClick={() => onTaskSelect(closestUnscheduled)}
                          className="w-full mt-2 bg-[#090d16] text-[#84cc16] hover:bg-slate-800 text-[10px] font-bold uppercase tracking-wider py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 border border-slate-700"
                        >
                          Agendar para este Técnico
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </InfoWindow>
          );
        })()}

        {/* Marcadores das Tarefas Gerais */}
        {tasks.map((task) => {
          // Se este técnico estiver selecionado e esta tarefa for uma das suas paragens numeradas,
          // não renderizar o marcador genérico para evitar duplicados ou confusão visual
          const isStopOfSelectedTech = selectedTechMarker && techAssignedTasks.some(st => (st.id && st.id === task.id) || (st.twentyId && st.twentyId === task.twentyId));
          if (isStopOfSelectedTech) return null;

          const isHighlighted = highlightedIds.includes(task.id);
          const isLate = resolveTaskOverdue(task);
          const serviceColor = getServiceColor(task);
          const techColor = task.technicianColor || getTechnicianColor(task.technician || (task.stage === "Entrada" ? "Unscheduled" : null));
          const color = isLate ? "#f59e0b" : (serviceColor || (showTechnicianColors ? techColor : "#3b82f6"));
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
                onTaskSelect(task);
              }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: isHighlighted ? "#ffffff" : color,
                fillOpacity: 1,
                strokeWeight: alertColor ? (isHighlighted ? 8 : 6) : (isHighlighted ? 6 : 3),
                strokeColor: alertColor || (isHighlighted ? color : "#ffffff"),
                scale: isLate ? 10 : (isHighlighted ? 10 : 8),
              }}
              label={
                isLate
                  ? {
                      text: isTechnicianView ? `! ${dueTime}` : "ATR",
                      className: "bg-amber-100 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-amber-400 shadow-md",
                      color: "#92400e",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }
                  : undefined
              }
              animation={
                isLate
                  ? window.google.maps.Animation.BOUNCE
                  : isHighlighted
                    ? window.google.maps.Animation.BOUNCE
                    : undefined
              }
              title={isLate ? `Visita atrasada (${dueTime})` : task.title}
            />
          );
        })}

        {/* InfoWindow compacto para técnico (visitas atrasadas) */}
        {selectedMarker && isTechnicianView && resolveTaskOverdue(selectedMarker) && (
          <InfoWindow
            position={{ lat: selectedMarker.coordinates[0], lng: selectedMarker.coordinates[1] }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 max-w-[220px] font-sans">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg mb-2">
                Visita atrasada
              </div>
              <div className="font-black text-slate-900 text-sm">{selectedMarker.client || selectedMarker.title}</div>
              <div className="text-xs text-slate-600 mt-1">{selectedMarker.address}</div>
              <div className="text-[11px] font-bold text-amber-800 mt-2">
                Hora prevista:{" "}
                {selectedMarker.dueDate
                  ? new Date(selectedMarker.dueDate).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </div>
              <button
                onClick={() => onTaskSelect(selectedMarker)}
                className="w-full mt-2 bg-[#090d16] text-[#84cc16] text-[10px] font-black uppercase tracking-wider py-2 px-2 rounded-xl"
              >
                Abrir visita
              </button>
            </div>
          </InfoWindow>
        )}

        {/* InfoWindow para detalhes da Tarefa */}
        {selectedMarker && !isTechnicianView && (
          <InfoWindow
            position={{ lat: selectedMarker.coordinates[0], lng: selectedMarker.coordinates[1] }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1 max-w-[200px]">
              <div className="flex justify-between items-start gap-2">
                <div className="font-bold text-slate-900 text-sm">{selectedMarker.title}</div>
                <div className="bg-slate-100 text-[9px] font-black px-1.5 py-0.5 rounded text-slate-500 uppercase shrink-0">#{selectedMarker.nsi}</div>
              </div>
              {selectedMarker.delayAlert && (
                <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 mb-1 inline-block ${
                  selectedMarker.delayAlert === 'red' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  ⚠️ Aguarda há {selectedMarker.delayDays} dias
                </div>
              )}
              <div className="text-xs text-slate-500 mb-2">{selectedMarker.company || selectedMarker.client}</div>
              <div className="text-[10px] text-slate-600 border-t pt-1 mb-2">
                {selectedMarker.address}
              </div>
              <button 
                onClick={() => onTaskSelect(selectedMarker)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-2 rounded-xl transition-all shadow-sm"
              >
                Ver no CRM
              </button>
            </div>
          </InfoWindow>
        )}

        {/* Renderização do Trajeto em Tempo Real do Técnico Selecionado */}
        {techLiveRouteDirections && (
          <DirectionsRenderer
            directions={techLiveRouteDirections}
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
        {directionsResponse && (
          <DirectionsRenderer
            directions={directionsResponse}
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

      {/* Overlay de Info de Rota */}
      {directionsResponse && optimizedRoute && (
        <div className="absolute bottom-6 left-6 bg-slate-950/95 backdrop-blur shadow-2xl rounded-2xl p-4 border border-slate-800 z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Tempo Total (Google Maps)</div>
              <div className="text-xl font-black text-white">
                {(() => {
                  const totalSecs = directionsResponse.routes[0].legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0);
                  return totalSecs / 60 > 60 
                    ? `${Math.floor(totalSecs / 3600)}h ${Math.round((totalSecs % 3600) / 60)}min`
                    : `${Math.round(totalSecs / 60)} min`;
                })()}
              </div>
            </div>
          </div>
          <div className="flex gap-4 border-t border-slate-900 pt-2">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Distância</div>
              <div className="text-sm font-bold text-slate-200">
                {(directionsResponse.routes[0].legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0) / 1000).toFixed(1)} km
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Custo Combustível</div>
              <div className="text-sm font-bold text-emerald-500">
                {((directionsResponse.routes[0].legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0) / 1000) * (fuelConsumption / 100) * fuelPrice).toFixed(2)}€
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
