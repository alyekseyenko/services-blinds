export const GEOCODE_AUTO_BATCH = 5;
export const GEOCODE_MANUAL_BATCH = 30;

export type GeocodeQueueOpp = {
  twentyId: string;
  title: string;
  address: string;
  coordinates?: [number, number] | null;
};

export function hasUsableServiceAddress(address: string | undefined): boolean {
  const trimmed = address?.trim();
  return Boolean(trimmed && trimmed !== "N/A");
}

export function isMissingGps(
  coordinates?: readonly number[] | null
): boolean {
  const lat = coordinates?.[0];
  const lng = coordinates?.[1];
  return lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng);
}

/** Missing GPS first so «Sincronizar moradas» does not spend the batch on pins that already exist. */
export function prioritizeMissingGps<T extends { coordinates?: readonly number[] | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => Number(!isMissingGps(a.coordinates)) - Number(!isMissingGps(b.coordinates)));
}

export function geocodeBatchLimit(forceRegeocode?: string | null): number {
  if (forceRegeocode === "all" || (forceRegeocode && forceRegeocode !== "all")) {
    return GEOCODE_MANUAL_BATCH;
  }
  return GEOCODE_AUTO_BATCH;
}
