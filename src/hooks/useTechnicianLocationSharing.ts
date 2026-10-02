"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";

type UseTechnicianLocationSharingArgs = {
  userId: string | null;
  userName: string;
  role: string | undefined;
  enabledPref: boolean;
  onTogglePref: (next: boolean) => void;
  onConsentGranted?: () => void;
  onConsentDenied?: () => void;
  onPositionUpdate?: (pos: GeolocationPosition) => void;
};

function isWithinSharingHours(date: Date): boolean {
  const hour = date.getHours();
  const isLunch = hour >= 13 && hour < 14;
  return !isLunch && hour >= 7 && hour < 22;
}

export function useTechnicianLocationSharing({
  userId,
  userName,
  role,
  enabledPref,
  onTogglePref,
  onConsentGranted,
  onConsentDenied,
  onPositionUpdate,
}: UseTechnicianLocationSharingArgs) {
  const [sharingEnabled, setSharingEnabled] = useState(enabledPref);
  const lastPositionRef = useRef<GeolocationPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const onPositionUpdateRef = useRef(onPositionUpdate);
  onPositionUpdateRef.current = onPositionUpdate;

  useEffect(() => {
    setSharingEnabled(enabledPref);
  }, [enabledPref]);

  const postLocation = useCallback(
    (pos: GeolocationPosition) => {
      if (!userId || role !== "technician") return;
      if (!sharingEnabled) return;
      if (!isWithinSharingHours(new Date())) return;

      void fetch("/api/location", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId: userId,
          technicianName: userName,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      }).catch(() => {});
    },
    [role, sharingEnabled, userId, userName]
  );

  const handlePosition = useCallback(
    (pos: GeolocationPosition) => {
      lastPositionRef.current = pos;
      onPositionUpdateRef.current?.(pos);
      postLocation(pos);
    },
    [postLocation]
  );

  const clearServerLocation = useCallback(() => {
    if (!userId) return;
    void fetch(`/api/location?technicianId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {});
  }, [userId]);

  const toggleSharing = useCallback(() => {
    const next = !sharingEnabled;
    setSharingEnabled(next);
    onTogglePref(next);
    localStorage.setItem(CLIENT_PREF_KEYS.LOCATION_SHARING, String(next));

    if (!next) {
      clearServerLocation();
      return;
    }

    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePosition(pos);
        onConsentGranted?.();
      },
      () => {
        setSharingEnabled(false);
        onTogglePref(false);
        localStorage.setItem(CLIENT_PREF_KEYS.LOCATION_SHARING, "false");
        onConsentDenied?.();
      }
    );
  }, [
    clearServerLocation,
    handlePosition,
    onConsentDenied,
    onConsentGranted,
    onTogglePref,
    sharingEnabled,
  ]);

  useEffect(() => {
    if (!sharingEnabled || role !== "technician" || !userId || !("geolocation" in navigator)) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        handlePosition(pos);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 60_000 }
    );

    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      clearServerLocation();
    };

    window.addEventListener("pagehide", onPageHide);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [clearServerLocation, handlePosition, role, sharingEnabled, userId]);

  useVisibleInterval(
    () => {
      const pos = lastPositionRef.current;
      if (pos) postLocation(pos);
    },
    sharingEnabled ? 60_000 : null,
    { enabled: role === "technician" && Boolean(userId) }
  );

  return {
    sharingEnabled,
    toggleSharing,
    clearServerLocation,
  };
}
