export function buildNavigationUrls(
  address: string,
  coordinates?: [number, number] | null
): { googleMaps: string; waze: string; wazeWeb: string } {
  const hasCoords = coordinates && coordinates[0] != null && coordinates[1] != null;
  const destination = hasCoords
    ? `${coordinates[0]},${coordinates[1]}`
    : encodeURIComponent(address || "");

  return {
    googleMaps: hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || "")}`,
    waze: hasCoords
      ? `waze://?ll=${coordinates![0]},${coordinates![1]}&navigate=yes`
      : `waze://?q=${encodeURIComponent(address || "")}&navigate=yes`,
    wazeWeb: hasCoords
      ? `https://waze.com/ul?ll=${coordinates![0]},${coordinates![1]}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(address || "")}&navigate=yes`,
  };
}

export function openNavigation(
  provider: "google" | "waze",
  address: string,
  coordinates?: [number, number] | null
): void {
  const urls = buildNavigationUrls(address, coordinates);
  const url = provider === "waze" ? urls.waze : urls.googleMaps;

  if (provider === "waze" && typeof window !== "undefined") {
    const fallback = window.open(urls.wazeWeb, "_blank");
    if (!fallback) window.location.href = urls.wazeWeb;
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
