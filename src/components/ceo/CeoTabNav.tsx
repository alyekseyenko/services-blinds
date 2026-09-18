"use client";

import { BarChart3, Target, Navigation, Star } from "lucide-react";

export type CeoTab = "summary" | "commercial" | "operations" | "feedback";

export interface CeoTabNavProps {
  activeTab: CeoTab;
  onTabChange: (tab: CeoTab) => void;
}

const tabs: { id: CeoTab; label: string; icon: typeof BarChart3 }[] = [
  { id: "summary", label: "Sumário & Finanças", icon: BarChart3 },
  { id: "commercial", label: "Comercial & Pipeline", icon: Target },
  { id: "operations", label: "Operações & Frota", icon: Navigation },
  { id: "feedback", label: "Voz do Cliente", icon: Star },
];

export default function CeoTabNav({ activeTab, onTabChange }: CeoTabNavProps) {
  return (
    <div className="sticky top-0 z-20 flex w-full flex-col gap-2 rounded-[2rem] border border-slate-200/80 bg-white/95 p-2 shadow-md backdrop-blur-md md:flex-row">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === id
              ? "bg-[#121622] text-white shadow-md"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${
              activeTab === id
                ? id === "feedback"
                  ? "text-amber-400 fill-amber-400"
                  : "text-[#84cc16]"
                : "text-slate-400"
            }`}
          />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
