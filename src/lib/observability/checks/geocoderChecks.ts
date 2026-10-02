import { geocodeAddress } from "@/lib/geocoder";
import { defineE2ECheck } from "../checkHelpers";

export const geocoderConfigCheck = defineE2ECheck({
  id: "geocoder-config",
  name: "Geocoder (config)",
  category: "APP",
  description: "Geocoding disponível (Nominatim público ou Google)",
  tier: "safe",
  covers: ["system:geocoder"],
  remediation:
    "Opcional: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para fallback Google.",
  async run() {
    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
    return {
      status: "PASS",
      message: googleKey
        ? "Nominatim + fallback Google configurado."
        : "Nominatim disponível (sem chave Google).",
      details: { hasGoogleKey: Boolean(googleKey) },
    };
  },
});

export const geocoderLiveCheck = defineE2ECheck({
  id: "geocoder-live",
  name: "Geocoder (live)",
  category: "APP",
  description: "Pesquisa Nominatim de teste",
  tier: "live",
  covers: ["system:geocoder"],
  timeoutMs: 20_000,
  remediation: "Verifique conectividade HTTPS e limites do Nominatim.",
  async run() {
    const result = await geocodeAddress("Lisboa, Portugal");
    if (!result) {
      return {
        status: "WARN",
        message: "Geocoder não devolveu coordenadas para Lisboa.",
      };
    }
    return {
      status: "PASS",
      message: `Geocoding OK via ${result.provider}.`,
      details: { provider: result.provider, coords: result.coords },
    };
  },
});

export const googleMapsKeyCheck = defineE2ECheck({
  id: "google-maps-key",
  name: "Chave Google Maps",
  category: "APP",
  description: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para mapas no cliente",
  tier: "safe",
  covers: ["system:google-maps-key"],
  remediation: "Defina NEXT_PUBLIC_GOOGLE_MAPS_API_KEY e reconstrua a imagem Docker.",
  async run() {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
    if (!key) {
      return {
        status: process.env.NODE_ENV === "production" ? "FAIL" : "WARN",
        message: "Chave Google Maps em falta.",
      };
    }
    return {
      status: "PASS",
      message: "Chave Google Maps presente.",
    };
  },
});
