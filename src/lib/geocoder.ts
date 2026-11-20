import { logger } from "@/lib/logger";

const GEOCODER_TIMEOUT_MS = 8000;

export interface GeocodeResult {
  coords: [number, number];
  provider: 'nominatim' | 'google_places' | 'google_geocoding';
}

/** Nominatim/Google resolve better with an explicit country for PT field addresses. */
export function buildGeocodeQuery(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return trimmed;
  if (/portugal/i.test(trimmed)) return trimmed;
  return `${trimmed}, Portugal`;
}

/** "Nº 1" confunde o mapa. O ordinal do nome da rua ("1º de Maio") fica. */
export function normalizeGeocodeAddress(address: string): string {
  return address.replace(/\bN\.?\s*º\s*/gi, "").replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim();
}

export function extractPtPostcode(address: string): string | null {
  const match = address.match(/\b(\d{4}-\d{3})\b/);
  return match?.[1] ?? null;
}

const LOCATION_RANK = ["ROOFTOP", "RANGE_INTERPOLATED", "GEOMETRIC_CENTER"] as const;

export function pickPreciseGoogleLocation(
  results: Array<{ geometry?: { location?: { lat?: number; lng?: number }; location_type?: string } }>,
  allowStreetCenter = true
): [number, number] | null {
  const ranks = allowStreetCenter
    ? LOCATION_RANK
    : LOCATION_RANK.filter((rank) => rank !== "GEOMETRIC_CENTER");
  for (const wanted of ranks) {
    for (const result of results) {
      const locationType = result.geometry?.location_type;
      const lat = result.geometry?.location?.lat;
      const lng = result.geometry?.location?.lng;
      if (locationType !== wanted) continue;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      return [lat, lng];
    }
  }
  return null;
}

/** "Rua 1º de Maio 1" fica "Rua 1º de Maio" quando o número da porta não existe no mapa. */
export function stripTrailingDoorNumber(address: string): string {
  return address.replace(/\s+\d+[a-zA-Z]?\s*(?=,|$)/, "").replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim();
}

type NominatimHit = {
  lat?: string;
  lon?: string;
  class?: string;
  addresstype?: string;
  address?: { house_number?: string; road?: string };
};

/** Porta, se existir. Senão o eixo da rua. Não aceita só a vila. */
export function nominatimStreetCoords(hit: NominatimHit | null | undefined): [number, number] | null {
  if (!hit?.lat || !hit?.lon) return null;
  const lat = parseFloat(hit.lat);
  const lng = parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (hit.address?.house_number) return [lat, lng];
  const isRoad =
    hit.class === "highway" || hit.addresstype === "road" || hit.addresstype === "residential";
  if (isRoad && hit.address?.road) return [lat, lng];
  return null;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    logger.info("[Geocoder] Início do geocoding");
    const query = buildGeocodeQuery(normalizeGeocodeAddress(address));
    const postcode = extractPtPostcode(query);
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (googleApiKey) {
      const queries = [query];
      const streetOnly = stripTrailingDoorNumber(query);
      if (streetOnly && streetOnly !== query) queries.push(streetOnly);
      const componentSets: Array<[string, boolean]> = postcode
        ? [[`country:PT|postal_code:${postcode}`, true], ["country:PT", false]]
        : [["country:PT", true]];

      for (const [components, allowStreetCenter] of componentSets) {
        for (const attempt of queries) {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(attempt)}&components=${encodeURIComponent(components)}&region=pt&key=${googleApiKey}`,
            { signal: AbortSignal.timeout(GEOCODER_TIMEOUT_MS) }
          );
          if (!response.ok) continue;
          const data = await response.json();
          if (data.status !== "OK" || !Array.isArray(data.results)) continue;
          const precise = pickPreciseGoogleLocation(data.results, allowStreetCenter);
          if (precise) {
            logger.info("[Geocoder] Sucesso via Google Geocoding");
            return { coords: precise, provider: "google_geocoding" };
          }
        }
      }
    } else {
      logger.warn("[Geocoder] Sem chave Google. A usar mapa aberto.");
    }

    try {
      const nominatimResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=pt&addressdetails=1`, {
        headers: {
          'User-Agent': 'BlindsTechApp/1.0'
        },
        signal: AbortSignal.timeout(GEOCODER_TIMEOUT_MS),
      });

      if (nominatimResponse.ok) {
        const nominatimData = await nominatimResponse.json();
        const coords = nominatimStreetCoords(nominatimData?.[0]);
        if (coords) {
          logger.info("[Geocoder] Sucesso via Nominatim");
          return { coords, provider: 'nominatim' };
        }
      }
      logger.info("[Geocoder] Nominatim sem número de porta");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.warn("[Geocoder] Nominatim falhou", { error: message });
    }

    logger.info("[Geocoder] Nenhum provedor encontrou a morada");
    return null;
  } catch (error) {
    logger.error("[Geocoder] Erro crítico", {}, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
