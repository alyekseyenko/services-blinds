import { logger } from "@/lib/logger";

const GEOCODER_TIMEOUT_MS = 8000;

export interface GeocodeResult {
  coords: [number, number];
  provider: 'nominatim' | 'google_places' | 'google_geocoding';
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    logger.info("[Geocoder] Início do geocoding");

    try {
      const nominatimResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
        headers: {
          'User-Agent': 'BlindsTechApp/1.0'
        },
        signal: AbortSignal.timeout(GEOCODER_TIMEOUT_MS),
      });

      if (nominatimResponse.ok) {
        const nominatimData = await nominatimResponse.json();
        if (nominatimData && nominatimData.length > 0) {
          const coords: [number, number] = [parseFloat(nominatimData[0].lat), parseFloat(nominatimData[0].lon)];
          logger.info("[Geocoder] Sucesso via Nominatim");
          return { coords, provider: 'nominatim' };
        }
      }
      logger.info("[Geocoder] Nominatim sem resultados");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.warn("[Geocoder] Nominatim falhou", { error: message });
    }

    logger.info("[Geocoder] Fallback Google Maps");
    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!googleApiKey) {
      logger.warn("[Geocoder] Sem chave Google — abortar");
      return null;
    }

    const placesResponse = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(address)}&inputtype=textquery&fields=geometry&key=${googleApiKey}`, {
      signal: AbortSignal.timeout(GEOCODER_TIMEOUT_MS),
    });

    if (placesResponse.ok) {
      const placesData = await placesResponse.json();
      if (placesData.status === 'OK' && placesData.candidates && placesData.candidates.length > 0) {
        const location = placesData.candidates[0].geometry.location;
        const coords: [number, number] = [location.lat, location.lng];
        logger.info("[Geocoder] Sucesso via Google Places");
        return { coords, provider: 'google_places' };
      }
    }

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`, {
      signal: AbortSignal.timeout(GEOCODER_TIMEOUT_MS),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const coords: [number, number] = [location.lat, location.lng];
        logger.info("[Geocoder] Sucesso via Google Geocoding");
        return { coords, provider: 'google_geocoding' };
      }
    }

    logger.info("[Geocoder] Nenhum provedor encontrou a morada");
    return null;
  } catch (error) {
    logger.error("[Geocoder] Erro crítico", {}, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
