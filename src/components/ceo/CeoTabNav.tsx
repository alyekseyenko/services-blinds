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
  { id: "commercial", label: "Comercial & Pipeline", shortLabel: "Comercial", icon: Target },
  { id: "operations", label: "Operações & Frota", shortLabel: "Operações", icon: Navigation },
  { id: "feedback", label: "Voz do Cliente", shortLabel: "Feedback", icon: Star },
];

export default function CeoTabNav({ activeTab, onTabChange }: CeoTabNavProps) {
  return (
    <div
      className="sticky top-0 z-20 w-full rounded-[2rem] border border-slate-200/80 bg-white/95 p-2 shadow-md backdrop-blur-md safe-top"
    >
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory custom-scrollbar md:flex-row md:overflow-visible">
        {tabs.map(({ id, label, shortLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "flex min-h-12 shrink-0 snap-start items-center justify-center gap-2 rounded-[1.25rem] px-4 py-3 text-xs font-black uppercase tracking-wider transition-all md:flex-1 md:rounded-[1.5rem] md:px-6",
              activeTab === id
                ? "bg-[#121622] text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
            title={label}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                activeTab === id
                  ? id === "feedback"
                    ? "fill-amber-400 text-amber-400"
                    : "text-[#84cc16]"
                  : "text-slate-400"
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
