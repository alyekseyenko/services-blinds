"use client";
import React from "react";
import { Map as MapIcon, List, Calendar as CalendarIcon, History } from "lucide-react";
import { cn } from "@/lib/cn";

interface BottomNavProps {
  view: string;
  setView: (v: string) => void;
  setSelectedTask: (t: any) => void;
}

function BottomNav({ view, setView, setSelectedTask }: BottomNavProps) {
  const navItems = [
    { id: "map", label: "Mapa", icon: MapIcon },
    { id: "list", label: "Lista", icon: List },
    { id: "calendar", label: "Calendário", icon: CalendarIcon },
    { id: "history", label: "Histórico", icon: History },
  ];

  return (
    <nav
      aria-label="Navegação Principal"
      data-tour="tech-bottom-nav"
      className="fixed bottom-0 left-0 z-40 w-full shrink-0 select-none border-t-2 border-border-strong bg-ink px-3 py-2 text-ink-foreground safe-bottom touch-manipulation max-md:landscape:py-1"
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-around md:max-w-4xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-tour={`tech-nav-${item.id}`}
              onClick={() => {
                setView(item.id);
                setSelectedTask(null);
              }}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-12 min-w-[4.2rem] flex-col items-center justify-center gap-1 rounded-full border-2 border-transparent px-2 py-1.5 transition-all active:scale-95",
                isActive
                  ? "border-border-strong bg-neon font-black text-neon-foreground"
                  : "text-ink-foreground/70 hover:text-ink-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive ? "text-neon-foreground" : "currentColor")} strokeWidth={2} />
              <span className={cn("text-xs font-black uppercase tracking-wider", isActive ? "text-neon-foreground" : "currentColor")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default React.memo(BottomNav);
