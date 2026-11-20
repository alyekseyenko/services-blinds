"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "map_clustering_enabled";

export function useMapClusteringEnabled() {
  const [clusteringEnabled, setClusteringEnabledState] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setClusteringEnabledState(true);
      else if (stored === "0") setClusteringEnabledState(false);
    } catch {
      /* ignore */
    }
  }, []);

  const setClusteringEnabled = useCallback((next: boolean) => {
    setClusteringEnabledState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleClustering = useCallback(() => {
    setClusteringEnabled(!clusteringEnabled);
  }, [clusteringEnabled, setClusteringEnabled]);

  return { clusteringEnabled, setClusteringEnabled, toggleClustering };
}
