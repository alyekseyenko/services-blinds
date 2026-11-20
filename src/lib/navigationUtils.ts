export type NavigationUrls = {
  googleMaps: string;
  googleMapsNative: string | null;
  waze: string;
  wazeWeb: string;
};

function hasValidCoordinates(coordinates?: [number, number] | null): boolean {
  if (!coordinates || coordinates[0] == null || coordinates[1] == null) return false;
  const lat = coordinates[0];
  const lng = coordinates[1];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

function detectMobilePlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export function buildGoogleMapsNativeUrl(
  address: string,
  coordinates?: [number, number] | null,
  platform: "ios" | "android" | "other" = detectMobilePlatform()
): string | null {
  if (platform === "other") return null;

  const hasCoords = hasValidCoordinates(coordinates);
  const lat = coordinates?.[0];
  const lng = coordinates?.[1];
  const trimmedAddress = (address || "").trim();

  if (platform === "ios") {
    if (hasCoords) {
      return `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    }
    if (trimmedAddress) {
      return `comgooglemaps://?daddr=${encodeURIComponent(trimmedAddress)}&directionsmode=driving`;
    }
    return null;
  }

  if (hasCoords) {
    return `google.navigation:q=${lat},${lng}`;
  }
  if (trimmedAddress) {
    return `geo:0,0?q=${encodeURIComponent(trimmedAddress)}`;
  }
  return null;
}

export function buildNavigationUrls(
  address: string,
  coordinates?: [number, number] | null
): NavigationUrls {
  const hasCoords = hasValidCoordinates(coordinates);
  const lat = coordinates?.[0];
  const lng = coordinates?.[1];
  const trimmedAddress = (address || "").trim();
  const encodedAddress = encodeURIComponent(trimmedAddress);

  const googleMaps = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;

  const waze = hasCoords
    ? `waze://?ll=${lat},${lng}&navigate=yes`
    : `waze://?q=${encodedAddress}&navigate=yes`;

  const wazeWeb = hasCoords
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;

  return {
    googleMaps,
    googleMapsNative: buildGoogleMapsNativeUrl(trimmedAddress, coordinates),
    waze,
    wazeWeb,
  };
}

/** Abre app nativa quando possível; caso contrário usa URL HTTPS (melhor em PWA). */
function openExternalNavigation(nativeUrl: string | null, webUrl: string): void {
  if (typeof window === "undefined") return;

  const mobile = detectMobilePlatform() !== "other";

  if (mobile && nativeUrl && !nativeUrl.startsWith("http")) {
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    window.addEventListener("pagehide", cancel, { once: true });
    window.addEventListener("blur", cancel, { once: true });

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        window.location.href = webUrl;
      }
    }, 900);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        cancelled = true;
        window.clearTimeout(timer);
      }
    };
    document.addEventListener("visibilitychange", onVisibility, { once: true });

    window.location.href = nativeUrl;
    return;
  }

  window.location.href = webUrl;
}

/** Rota do dia: Google Maps com todas as paragens. O Waze só aceita um destino. */
export function buildGoogleDayRouteUrl(
  stops: Array<[number, number]>,
  origin?: { lat: number; lng: number } | null
): string | null {
  const points = stops.filter((stop) => hasValidCoordinates(stop));
  if (points.length === 0) return null;

  const pair = (lat: number, lng: number) => `${lat},${lng}`;
  const originPair =
    origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
      ? pair(origin.lat, origin.lng)
      : null;

  if (!originPair && points.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${pair(points[0][0], points[0][1])}&travelmode=driving`;
  }

  const start = originPair ?? pair(points[0][0], points[0][1]);
  const end = pair(points[points.length - 1][0], points[points.length - 1][1]);
  const middle = (originPair ? points.slice(0, -1) : points.slice(1, -1)).map((stop) =>
    pair(stop[0], stop[1])
  );
  const waypoints = middle.slice(0, 9).join("|");
  const base = `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${end}&travelmode=driving`;
  return waypoints ? `${base}&waypoints=${encodeURIComponent(waypoints)}` : base;
}

export function openDayRoute(
  provider: "google" | "waze",
  stops: Array<[number, number]>,
  origin?: { lat: number; lng: number } | null
): void {
  const points = stops.filter((stop) => hasValidCoordinates(stop));
  if (points.length === 0) return;
  if (provider === "waze") {
    openNavigation("waze", "", points[0]);
    return;
  }
  const url = buildGoogleDayRouteUrl(points, origin);
  if (!url || typeof window === "undefined") return;
  window.location.href = url;
}

export function openNavigation(
  provider: "google" | "waze",
  address: string,
  coordinates?: [number, number] | null
): void {
  const urls = buildNavigationUrls(address, coordinates);

  if (provider === "waze") {
    openExternalNavigation(urls.waze, urls.wazeWeb);
    return;
  }

  openExternalNavigation(urls.googleMapsNative, urls.googleMaps);
}
