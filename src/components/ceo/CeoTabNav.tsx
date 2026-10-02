"use client";

import { BarChart3, Target, Navigation, Star } from "lucide-react";
import { cn } from "@/lib/cn";

export type CeoTab = "summary" | "commercial" | "operations" | "feedback";

export interface CeoTabNavProps {
  activeTab: CeoTab;
  onTabChange: (tab: CeoTab) => void;
}

const tabs: { id: CeoTab; label: string; shortLabel: string; icon: typeof BarChart3 }[] = [
  { id: "summary", label: "Sumário & Finanças", shortLabel: "Sumário", icon: BarChart3 },
  { id: "commercial", label: "Comercial e funil", shortLabel: "Comercial", icon: Target },
  { id: "operations", label: "Operações & Frota", shortLabel: "Operações", icon: Navigation },
  { id: "feedback", label: "Voz do Cliente", shortLabel: "Voz", icon: Star },
];

export default function CeoTabNav({ activeTab, onTabChange }: CeoTabNavProps) {
  return (
    <div
      className="safe-top sticky top-0 z-20 w-full rounded-2xl border-2 border-border-strong bg-card p-2"
      data-tour="ceo-tabs"
    >
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory custom-scrollbar md:flex-row md:overflow-visible">
        {tabs.map(({ id, label, shortLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "flex min-h-12 shrink-0 snap-start items-center justify-center gap-2 rounded-xl border-2 border-transparent px-4 py-3 text-xs font-black uppercase tracking-wider transition-all md:flex-1 md:px-6",
              activeTab === id
                ? "border-border-strong bg-neon text-neon-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={label}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                activeTab === id
                  ? id === "feedback"
                    ? "fill-warning-solid text-warning-solid"
                    : "text-neon-foreground"
                  : "text-muted-foreground"
              )}
            />
            <span className="whitespace-nowrap md:hidden">{shortLabel}</span>
            <span className="hidden whitespace-nowrap md:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
