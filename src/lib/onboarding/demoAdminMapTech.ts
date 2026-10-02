import { HQ_LAT, HQ_LNG } from "@/lib/hq";
import { getOnboardingDemoCoordinates } from "@/lib/onboarding/demoMapPin";
import type { TechnicianLocation } from "@/hooks/useTechnicianLocations";

export const ONBOARDING_DEMO_TECH_ID = "onboarding-demo-field-tech";
export const ONBOARDING_DEMO_TECH_NAME = "João — exemplo do guia";

/** Ponto de partida do técnico fictício (perto da sede). */
export function getDemoTechnicianStartLatLng(): { lat: number; lng: number } {
  return { lat: HQ_LAT + 0.0025, lng: HQ_LNG + 0.0015 };
}

/** Interpola entre sede e o pin de formação (simula deslocação). */
export function getDemoTechnicianLatLng(progress: number): { lat: number; lng: number } {
  const start = getDemoTechnicianStartLatLng();
  const [destLat, destLng] = getOnboardingDemoCoordinates();
  const t = Math.min(1, Math.max(0, progress));
  return {
    lat: start.lat + (destLat - start.lat) * t,
    lng: start.lng + (destLng - start.lng) * t,
  };
}

export function createAdminOnboardingDemoTechnicianLocation(
  progress = 0.35
): TechnicianLocation {
  const { lat, lng } = getDemoTechnicianLatLng(progress);
  return {
    technicianId: ONBOARDING_DEMO_TECH_ID,
    technicianName: ONBOARDING_DEMO_TECH_NAME,
    lat,
    lng,
    lastUpdate: new Date().toISOString(),
    accuracy: 12,
  };
}
