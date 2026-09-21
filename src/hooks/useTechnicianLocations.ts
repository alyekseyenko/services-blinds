"use client";

import { useEffect, useState } from "react";

export interface TechnicianLocation {
  technicianId: string;
  technicianName: string;
  lat: number;
  lng: number;
  lastUpdate: string;
  accuracy?: number;
}

const POLL_INTERVAL_MS = 30_000;

export function useTechnicianLocations() {
  const [techniciansLocations, setTechniciansLocations] = useState<TechnicianLocation[]>([]);

  useEffect(() => {
    const fetchTechLocations = async () => {
      try {
        const res = await fetch("/api/location");
        if (res.ok) {
          const data = await res.json();
          setTechniciansLocations(data.technicians || []);
        }
      } catch {
        // Silent — map still works without live technician positions
      }
    };

    fetchTechLocations();
    const interval = setInterval(fetchTechLocations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return techniciansLocations;
}
