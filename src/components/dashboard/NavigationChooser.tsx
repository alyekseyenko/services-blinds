"use client";

import React, { useState } from "react";
import { Navigation, MapPin } from "lucide-react";
import { openNavigation } from "@/lib/navigationUtils";

interface NavigationChooserProps {
  address: string;
  coordinates?: [number, number] | null;
  className?: string;
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function NavigationChooser({
  address,
  coordinates,
  className = "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-bold text-primary-ink active:scale-[0.98]",
  label = "Navegar",
  onClick,
}: NavigationChooserProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleOpen = (e: React.MouseEvent, provider: "google" | "waze") => {
    e.stopPropagation();
    e.preventDefault();
    openNavigation(provider, address, coordinates);
    setShowPicker(false);
  };

  if (!showPicker) {
    return (
      <button
        type="button"
        onClick={(e) => {
          onClick?.(e);
          e.stopPropagation();
          setShowPicker(true);
        }}
        className={className}
      >
        <Navigation className="w-4 h-4 text-primary-ink" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={(e) => handleOpen(e, "google")}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ink text-xs font-black uppercase tracking-wider text-ink-foreground active:scale-[0.98] hover:bg-ink"
        >
          <MapPin className="w-4 h-4 text-primary-ink" />
          Google Maps
        </button>
        <button
          type="button"
          onClick={(e) => handleOpen(e, "waze")}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-info-solid text-xs font-black uppercase tracking-wider text-ink-foreground active:scale-[0.98] hover:bg-info-solid"
        >
          <Navigation className="w-4 h-4" />
          Waze
        </button>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(false);
        }}
        className="min-h-12 rounded-xl border border-border text-xs font-bold text-muted-foreground active:bg-muted"
      >
        Cancelar
      </button>
    </div>
  );
}
