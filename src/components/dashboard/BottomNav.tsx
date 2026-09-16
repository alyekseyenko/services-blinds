"use client";
import React from "react";
import { Map as MapIcon, List, Calendar as CalendarIcon, History } from "lucide-react";

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
    <nav aria-label="Navegação Principal" className="fixed bottom-0 left-0 w-full backdrop-blur-xl bg-white/95 border-t border-slate-200 py-2.5 px-4 z-40 shrink-0 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (typeof window !== "undefined" && "vibrate" in navigator) {
                  navigator.vibrate(20);
                }
                setView(item.id);
                setSelectedTask(null);
              }}
              className={`min-w-[4.2rem] min-h-[48px] px-2 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                isActive 
                  ? "text-[#090d16] bg-[#84cc16]/20 font-black" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#84cc16]" : "text-slate-500"}`} />
              <span className={`text-[11px] font-black uppercase tracking-wider ${isActive ? "text-[#090d16]" : "text-slate-600"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
