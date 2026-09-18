"use client";

import { Map as MapIcon, List, Calendar as CalendarIcon, History } from "lucide-react";
import { hapticLight } from "@/lib/haptics";
import { cn } from "@/lib/cn";

interface SideNavProps {
  view: string;
  setView: (v: string) => void;
  setSelectedTask: (t: null) => void;
}

const navItems = [
  { id: "map", label: "Mapa", icon: MapIcon },
  { id: "list", label: "Lista", icon: List },
  { id: "calendar", label: "Calendário", icon: CalendarIcon },
  { id: "history", label: "Histórico", icon: History },
];

export default function SideNav({ view, setView, setSelectedTask }: SideNavProps) {
  return (
    <nav
      aria-label="Navegação Principal"
      className="hidden lg:flex lg:w-20 lg:shrink-0 lg:flex-col lg:items-center lg:gap-2 lg:border-r lg:border-slate-200 lg:bg-white/95 lg:py-4 lg:pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              hapticLight();
              setView(item.id);
              setSelectedTask(null);
            }}
            className={cn(
              "flex min-h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl transition-all active:scale-95",
              isActive ? "bg-[#84cc16]/20 font-black text-[#090d16]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            <Icon className={cn("h-6 w-6", isActive ? "text-[#84cc16]" : "text-slate-500")} strokeWidth={2} />
            <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
