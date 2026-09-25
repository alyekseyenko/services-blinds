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
      className="hidden md:flex md:w-[4.75rem] md:shrink-0 md:flex-col md:items-center md:gap-1.5 md:border-r md:border-border md:bg-card/95 md:py-4 md:pb-[max(1rem,env(safe-area-inset-bottom))] lg:w-56 lg:items-stretch lg:px-3"
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
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-14 w-14 flex-col items-center justify-center gap-1 rounded-2xl transition-all active:scale-95 lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5",
              isActive
                ? "bg-[#84cc16]/20 font-black text-[#090d16]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            <Icon className={cn("h-6 w-6 shrink-0", isActive ? "text-[#84cc16]" : "text-slate-500")} strokeWidth={2} />
            <span
              className={cn(
                "hidden text-xs font-black uppercase tracking-wide lg:inline lg:text-[11px]",
                isActive ? "text-[#090d16]" : "text-slate-600"
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
