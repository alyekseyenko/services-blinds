"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MapLatLng } from "@/lib/map/mapBounds";
import { singlePointZoom } from "@/lib/map/mapBounds";

const FIT_PADDING = 56;

export function useMapAutoFit(
  map: google.maps.Map | null,
  points: MapLatLng[],
  resetKey: string
) {
  const userInteractedRef = useRef(false);
  const lastResetKeyRef = useRef(resetKey);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    if (resetKey !== lastResetKeyRef.current) {
      lastResetKeyRef.current = resetKey;
      userInteractedRef.current = false;
    }
  }, [resetKey]);

  useEffect(() => {
    if (!map) return;

    const suspend = () => {
      userInteractedRef.current = true;
    };

    const dragListener = map.addListener("dragstart", suspend);
    const div = map.getDiv();
    const touchListener = google.maps.event.addDomListener(div, "touchstart", suspend);
    const wheelListener = google.maps.event.addDomListener(div, "wheel", suspend);
    return () => {
      google.maps.event.removeListener(dragListener);
      google.maps.event.removeListener(touchListener);
      google.maps.event.removeListener(wheelListener);
    };
  }, [map]);

  const fitToPoints = useCallback(
    (target: MapLatLng[]) => {
      if (!map || target.length === 0) return;

      if (target.length === 1) {
        map.panTo(target[0]);
        map.setZoom(singlePointZoom());
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      for (const p of target) {
        bounds.extend(p);
      }
      map.fitBounds(bounds, FIT_PADDING);
    },
    [map]
  );

  useEffect(() => {
    if (!map || userInteractedRef.current) return;
    fitToPoints(pointsRef.current);
  }, [map, points, resetKey, fitToPoints]);

  const suspendAutoFit = useCallback(() => {
    userInteractedRef.current = true;
  }, []);

  const resetAutoFit = useCallback(() => {
    userInteractedRef.current = false;
  }, []);

  const fitNow = useCallback(
    (target: MapLatLng[]) => {
      userInteractedRef.current = false;
      fitToPoints(target);
    },
    [fitToPoints]
  );

  return { suspendAutoFit, resetAutoFit, fitNow };
}
