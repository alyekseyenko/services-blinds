"use client";

import { useEffect, useState } from "react";
import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";
import { useTechnicianLocationSharing } from "@/hooks/useTechnicianLocationSharing";
import { useToast } from "@/components/ui/ToastContext";

type TechnicianToast = ReturnType<typeof useToast>;

export function useTechnicianLocationState(params: {
  userId: string;
  userName: string;
  sessionRole: string | undefined;
  toast: TechnicianToast;
}) {
  const { userId, userName, sessionRole, toast } = params;

  const [showLocationConsent, setShowLocationConsent] = useState(false);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(false);
  const [showRgpdModal, setShowRgpdModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    at?: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = localStorage.getItem(CLIENT_PREF_KEYS.LOCATION_SHARING);
      if (consent === null) {
        setShowLocationConsent(true);
      } else {
        setLocationSharingEnabled(consent === "true");
      }
    }
  }, []);

  const { sharingEnabled: liveLocationSharing, toggleSharing: handleToggleLocationConsent } =
    useTechnicianLocationSharing({
      userId,
      userName,
      role: sessionRole,
      enabledPref: locationSharingEnabled,
      onTogglePref: setLocationSharingEnabled,
      onPositionUpdate: (pos) => {
        setUserLocation((prev) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          if (!prev) return { lat, lng, accuracy };
          const now = Date.now();
          const lastAt = prev.at ?? 0;
          const distM =
            Math.hypot(lat - prev.lat, lng - prev.lng) *
            111_320 *
            Math.cos((prev.lat * Math.PI) / 180);
          if (distM < 25 && now - lastAt < 10_000) return prev;
          return { lat, lng, accuracy, at: now };
        });
      },
      onConsentGranted: () =>
        toast.success("Localização ativa", "A partilha de GPS está ligada durante o expediente."),
      onConsentDenied: () =>
        toast.warning(
          "Permissão negada",
          "Ative a localização nas definições do navegador para partilhar a posição."
        ),
    });

  const locationSharingActive = liveLocationSharing && locationSharingEnabled;

  return {
    showLocationConsent,
    setShowLocationConsent,
    locationSharingEnabled,
    setLocationSharingEnabled,
    showRgpdModal,
    setShowRgpdModal,
    userLocation,
    locationSharingActive,
    handleToggleLocationConsent,
  };
}