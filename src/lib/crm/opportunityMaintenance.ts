import "server-only";

import {
  geocodeBatchLimit,
  hasUsableServiceAddress,
  isMissingGps,
  prioritizeMissingGps,
} from "@/lib/geocodeQueue";
import { geocodeAddress } from "@/lib/geocoder";
import { formatNavigationAddressLine } from "@/lib/visits/serviceAddressLine";
import { fetchAdminOpportunities, updateOpportunityCoordinates } from "./opportunities";

const addressCache = new Map<string, string>();

export type GeocodeFailure = {
  title: string;
  address: string;
  reason: string;
};

export interface OpportunityMaintenanceResult {
  geocoded: number;
  geocodePending: number;
  geocodeFailed: GeocodeFailure[];
  geocodeSkippedNoAddress: { title: string }[];
  /** Deprecated: auto-cancel of stale visits removed — always 0 for API consumers. */
  expiredCancelled: number;
  errors: string[];
}

export async function runOpportunityMaintenance(
  forceRegeocode?: string | null
): Promise<OpportunityMaintenanceResult> {
  const opportunities = await fetchAdminOpportunities();
  const errors: string[] = [];
  const geocodeFailed: GeocodeFailure[] = [];
  let geocoded = 0;

  const geocodeSkippedNoAddress = opportunities
    .filter((opp) => isMissingGps(opp.coordinates) && !hasUsableServiceAddress(opp.address))
    .map((opp) => ({ title: opp.title || opp.client || opp.twentyId }));

  const needsGeocoding = opportunities.filter((opp) => {
    if (!hasUsableServiceAddress(opp.address)) return false;
    if (forceRegeocode === opp.twentyId) return true;

    const cached = addressCache.get(opp.twentyId);
    const addressChanged = Boolean(cached && cached !== opp.address);
    const missingCoords = isMissingGps(opp.coordinates);

    if (forceRegeocode === "all") {
      return missingCoords || addressChanged;
    }

    return missingCoords || addressChanged;
  });

  const sorted = prioritizeMissingGps(needsGeocoding);
  const batchToProcess = sorted.slice(0, geocodeBatchLimit(forceRegeocode));

  for (let i = 0; i < batchToProcess.length; i++) {
    const opp = batchToProcess[i];
    try {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 1100));
      }

      const geoQuery = formatNavigationAddressLine(opp.rawAddress, opp.address);
      const geoResult = await geocodeAddress(geoQuery || opp.address);
      if (geoResult?.coords) {
        const [lat, lng] = geoResult.coords;
        await updateOpportunityCoordinates(opp.twentyId, lat, lng, opp.rawAddress);
        addressCache.set(opp.twentyId, opp.address);
        geocoded += 1;
      } else {
        addressCache.delete(opp.twentyId);
        geocodeFailed.push({
          title: opp.title || opp.client || opp.twentyId,
          address: opp.address,
          reason: "Morada sem correspondência no mapa.",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro de geocoding";
      errors.push(`${opp.title}: ${message}`);
      geocodeFailed.push({
        title: opp.title || opp.client || opp.twentyId,
        address: opp.address,
        reason: message,
      });
    }
  }

  opportunities.forEach((opp) => {
    if (opp.twentyId && hasUsableServiceAddress(opp.address) && !isMissingGps(opp.coordinates)) {
      addressCache.set(opp.twentyId, opp.address);
    }
  });

  return {
    geocoded,
    geocodePending: Math.max(needsGeocoding.length - batchToProcess.length, 0),
    geocodeFailed,
    geocodeSkippedNoAddress,
    expiredCancelled: 0,
    errors,
  };
}
