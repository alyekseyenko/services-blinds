"use client";

import { Calendar as CalendarIcon, History, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface AdminBottomNavProps {
  view: string;
  setView: (v: string) => void;
}

const navItems = [
  { id: "map", label: "Mapa", icon: MapIcon },
  { id: "calendar", label: "Agenda", icon: CalendarIcon },
  { id: "history", label: "Histórico", icon: History },
];

export function AdminBottomNav({ view, setView }: AdminBottomNavProps) {
  return (
    <nav
      aria-label="Navegação do painel"
      className="fixed bottom-0 left-0 z-40 w-full shrink-0 border-t border-border bg-card/95 px-3 py-2 text-foreground shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl safe-bottom lg:hidden"
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-around md:max-w-4xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-12 min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 transition-all active:scale-95",
                isActive ? "bg-[#84cc16]/20 font-black text-[#090d16]" : "text-slate-500"
              )}
            >
              <Icon
                className={cn("h-6 w-6", isActive ? "text-[#84cc16]" : "text-slate-500")}
                strokeWidth={2}
              />
              <span
                className={cn(
                  "text-xs font-black uppercase tracking-wider",
                  isActive ? "text-[#090d16]" : "text-slate-600"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
