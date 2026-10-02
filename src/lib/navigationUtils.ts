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
