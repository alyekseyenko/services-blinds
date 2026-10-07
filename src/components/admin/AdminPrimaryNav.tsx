"use client";

import {
  Calendar as CalendarIcon,
  History,
  LayoutDashboard,
  Map as MapIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const ADMIN_VIEW_IDS = ["home", "map", "calendar", "history"] as const;
export type AdminViewId = (typeof ADMIN_VIEW_IDS)[number];

const navItems: { id: AdminViewId; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Início", icon: LayoutDashboard },
  { id: "map", label: "Mapa", icon: MapIcon },
  { id: "calendar", label: "Agenda", icon: CalendarIcon },
  { id: "history", label: "Histórico", icon: History },
];

interface AdminPrimaryNavProps {
  view: string;
  setView: (v: string) => void;
}

/** Vistas principais — no menu ☰ (lista vertical). */
export function AdminPrimaryNav({ view, setView }: AdminPrimaryNavProps) {
  return (
    <div
      className="flex w-full flex-col gap-1"
      data-tour="admin-views"
    >
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
              "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition-all active:scale-[0.99]",
              isActive
                ? "border-2 border-border-strong bg-neon text-neon-foreground"
                : "text-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
