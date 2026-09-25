import "server-only";

import { geocodeAddress } from '@/lib/geocoder';
import { CRM_STAGES, isTaskCompleted, isTaskCancelled, isTaskInProgress } from './contract';
import { fetchAdminOpportunities, updateOpportunityCoordinates } from './opportunities';
import { cancelAppointment } from './tasks';

const addressCache = new Map<string, string>();

export interface OpportunityMaintenanceResult {
  geocoded: number;
  geocodePending: number;
  expiredCancelled: number;
  errors: string[];
}

export async function runOpportunityMaintenance(
  forceRegeocode?: string | null
): Promise<OpportunityMaintenanceResult> {
  const opportunities = await fetchAdminOpportunities();
  const errors: string[] = [];
  let geocoded = 0;
  let expiredCancelled = 0;

  const needsGeocoding = opportunities.filter((opp) => {
    if (!opp.address || opp.address === 'N/A') return false;
    if (forceRegeocode === 'all' || forceRegeocode === opp.twentyId) return true;

    const cached = addressCache.get(opp.twentyId);
    const addressChanged = cached && cached !== opp.address;
    const missingCoords = !opp.coordinates || !opp.coordinates[0];

    return missingCoords || addressChanged;
  });

  const batchToProcess = needsGeocoding.slice(0, 5);
  for (let i = 0; i < batchToProcess.length; i++) {
    const opp = batchToProcess[i];
    try {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, 1100));
      }

      const geoResult = await geocodeAddress(opp.address);
      if (geoResult?.coords) {
        const [lat, lng] = geoResult.coords;
        await updateOpportunityCoordinates(opp.twentyId, lat, lng, opp.rawAddress);
        addressCache.set(opp.twentyId, opp.address);
        geocoded += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro de geocoding';
      errors.push(`${opp.title}: ${message}`);
    }
  }

  opportunities.forEach((opp) => {
    if (opp.twentyId && opp.address) {
      addressCache.set(opp.twentyId, opp.address);
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredApps = opportunities.filter((o) => {
    if (!o.scheduledAt || !o.hasScheduledTask) return false;
    const scheduledDate = new Date(o.scheduledAt);
    scheduledDate.setHours(0, 0, 0, 0);

    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 2);

    const isPastGracePeriod = scheduledDate < cutoff;
    const isAlreadyDone =
      isTaskCompleted(o.taskStatus) || isTaskCancelled(o.taskStatus) || isTaskInProgress(o.taskStatus);

    return isPastGracePeriod && !isAlreadyDone;
  });

  for (const opp of expiredApps) {
    try {
      if (!opp.taskId) continue;
      await cancelAppointment(opp.taskId, opp.twentyId);
      expiredCancelled += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar';
      errors.push(`${opp.title}: ${message}`);
    }
  }

  return {
    geocoded,
    geocodePending: Math.max(needsGeocoding.length - batchToProcess.length, 0),
    expiredCancelled,
    errors,
  };
}
