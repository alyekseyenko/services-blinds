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
  className = "",
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
        <Navigation className="w-4 h-4 text-[#84cc16]" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => handleOpen(e, "google")}
        className="flex-1 h-12 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <MapPin className="w-4 h-4 text-[#84cc16]" />
        Google Maps
      </button>
      <button
        type="button"
        onClick={(e) => handleOpen(e, "waze")}
        className="flex-1 h-12 bg-[#33ccff] hover:bg-[#2bb8e8] text-[#090d16] rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <Navigation className="w-4 h-4" />
        Waze
      </button>
    </div>
  );
}
