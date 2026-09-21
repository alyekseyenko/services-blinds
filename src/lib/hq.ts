import { HQ_LABEL } from "@/lib/branding";

function parseCoord(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Generic defaults for the public repo — override via .env.local on production. */
const DEFAULT_LAT = 38.7223;
const DEFAULT_LNG = -9.1393;

export const HQ_LAT = parseCoord(process.env.NEXT_PUBLIC_HQ_LAT, DEFAULT_LAT);
export const HQ_LNG = parseCoord(process.env.NEXT_PUBLIC_HQ_LNG, DEFAULT_LNG);
export const HQ_COORDINATES: [number, number] = [HQ_LAT, HQ_LNG];
export const HQ_ADDRESS =
  process.env.NEXT_PUBLIC_HQ_ADDRESS || "Headquarters, Example City";

export interface HqLocation {
  address: string;
  coordinates: [number, number];
  name: string;
}

export function getHqLocation(): HqLocation {
  return {
    address: HQ_ADDRESS,
    coordinates: HQ_COORDINATES,
    name: HQ_LABEL,
  };
}
