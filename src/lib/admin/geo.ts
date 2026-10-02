/** Approximate km distance between two [lat, lng] points (same formula as admin map). */
export function euclideanKm(
  a: [number, number],
  b: [number, number]
): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

export function normalizeLocationKey(str: string | null | undefined): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function titleCaseCity(raw: string): string {
  return raw
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export interface CityKey {
  key: string;
  display: string;
}

export function resolveCityKeyFromRaw(rawLocation: string): CityKey {
  const trimmed = rawLocation.trim() || "Other Zones";
  return {
    key: normalizeLocationKey(trimmed),
    display: titleCaseCity(trimmed),
  };
}

export function resolveCityKeyFromOpportunity(opp: {
  addressCity?: string | null;
  address?: string | null;
}): CityKey {
  let rawLocation = opp.addressCity || "";
  if (!rawLocation && opp.address) {
    const parts = opp.address.split(",");
    if (parts.length > 1) {
      rawLocation = parts[parts.length - 2]?.trim() || parts[1]?.trim() || "";
    }
  }
  return resolveCityKeyFromRaw(rawLocation || "Other Zones");
}

export function citiesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return normalizeLocationKey(a) === normalizeLocationKey(b);
}
