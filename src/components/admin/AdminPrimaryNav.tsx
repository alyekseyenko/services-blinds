"use client";

import {
  Calendar as CalendarIcon,
  History,
  Map as MapIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const ADMIN_VIEW_IDS = ["map", "calendar", "history"] as const;
export type AdminViewId = (typeof ADMIN_VIEW_IDS)[number];

const navItems: { id: AdminViewId; label: string; icon: LucideIcon }[] = [
  { id: "map", label: "Mapa", icon: MapIcon },
  { id: "calendar", label: "Agenda", icon: CalendarIcon },
  { id: "history", label: "Histórico", icon: History },
];

interface AdminPrimaryNavProps {
  view: string;
  setView: (v: string) => void;
}

/** Compact Map / Agenda / Histórico — uma linha no cabeçalho. */
export function AdminPrimaryNav({ view, setView }: AdminPrimaryNavProps) {
  return (
    <div className="inline-flex max-w-full items-center gap-0.5 rounded-xl border-2 border-border-strong bg-muted p-0.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            data-tour={`admin-nav-${item.id}`}
            onClick={() => setView(item.id)}
            aria-current={isActive ? "page" : undefined}
            title={item.label}
            className={cn(
              "flex min-h-12 min-w-12 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-all active:scale-95 sm:min-w-0 sm:px-3",
              isActive
                ? "border-2 border-border-strong bg-neon text-neon-foreground"
                : "text-muted-foreground hover:bg-card hover:text-foreground active:bg-muted"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="sr-only sm:not-sr-only sm:truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
