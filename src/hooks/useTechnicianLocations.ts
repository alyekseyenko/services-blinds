"use client";

import { useCallback, useState } from "react";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";

export interface TechnicianLocation {
  technicianId: string;
  technicianName: string;
  lat: number;
  lng: number;
  lastUpdate: string;
  accuracy?: number;
}

const POLL_INTERVAL_MS = 30_000;

function locationsEqual(a: TechnicianLocation[], b: TechnicianLocation[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.technicianId !== right.technicianId ||
      left.lat !== right.lat ||
      left.lng !== right.lng ||
      left.lastUpdate !== right.lastUpdate
    ) {
      return false;
    }
  }
  return true;
}

export function useTechnicianLocations() {
  const [techniciansLocations, setTechniciansLocations] = useState<TechnicianLocation[]>([]);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const fetchTechLocations = useCallback(async () => {
    if (!pollingEnabled) return;
    try {
      const res = await fetch("/api/location", { credentials: "include" });
      if (res.status === 401) {
        setPollingEnabled(false);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { technicians?: TechnicianLocation[] };
      const next = data.technicians || [];
      setTechniciansLocations((prev) => (locationsEqual(prev, next) ? prev : next));
    } catch {
      // Silent — map still works without live technician positions
    }
  }, [pollingEnabled]);

  useVisibleInterval(
    () => {
      void fetchTechLocations();
    },
    pollingEnabled ? POLL_INTERVAL_MS : null,
    { enabled: pollingEnabled, runImmediately: true }
  );

  return techniciansLocations;
}
