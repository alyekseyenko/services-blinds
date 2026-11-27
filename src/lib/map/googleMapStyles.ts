/** Fundo do mapa (cinza frio, alinhado ao chrome da app — não branco puro). */
export const OPERATIONS_MAP_CANVAS = "#e8eaef";

/**
 * Operations map — fundo cinza claro, estradas chapadas, POI ocultos.
 * Partilhado por admin e técnico.
 */
export const OPERATIONS_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: OPERATIONS_MAP_CANVAS }] },
  { elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#525252" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: OPERATIONS_MAP_CANVAS }] },

  {
    featureType: "administrative.neighborhood",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#525252" }],
  },
  {
    featureType: "administrative.province",
    elementType: "labels",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cfd2d8" }, { visibility: "simplified" }],
  },

  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#e2e4e9" }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry",
    stylers: [{ color: "#dde0e6" }],
  },

  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
  { featureType: "poi.government", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },

  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#f2f3f6" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cfd2d8" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#404040" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#f2f3f6" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#eceef2" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0a0a0a" }, { weight: 0.4 }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#525252" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.stroke",
    stylers: [{ color: OPERATIONS_MAP_CANVAS }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#eef0f4" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#404040" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#404040" }],
  },

  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c5ccd6" }],
  },
  {
    featureType: "water",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

/** Controlo nativo do Google Maps (sem POI chrome extra). */
export function getOperationsMapOptions(hideNativeMapChrome: boolean) {
  return {
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
  };
}
