"use client";
import React from "react";
import { Map as MapIcon, List, Calendar as CalendarIcon, History } from "lucide-react";
import { hapticLight } from "@/lib/haptics";
import { cn } from "@/lib/cn";

interface BottomNavProps {
  view: string;
  setView: (v: string) => void;
  setSelectedTask: (t: any) => void;
}

export default function BottomNav({ view, setView, setSelectedTask }: BottomNavProps) {
  const navItems = [
    { id: "map", label: "Mapa", icon: MapIcon },
    { id: "list", label: "Lista", icon: List },
    { id: "calendar", label: "Calendário", icon: CalendarIcon },
    { id: "history", label: "Histórico", icon: History },
  ];

  return (
    <nav
      aria-label="Navegação Principal"
      className="fixed bottom-0 left-0 z-40 w-full shrink-0 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
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
                "flex min-h-12 min-w-[4.2rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 transition-all active:scale-95",
                isActive ? "bg-[#84cc16]/20 font-black text-[#090d16]" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive ? "text-[#84cc16]" : "text-slate-500")} strokeWidth={2} />
              <span className={cn("text-xs font-black uppercase tracking-wider", isActive ? "text-[#090d16]" : "text-slate-600")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
