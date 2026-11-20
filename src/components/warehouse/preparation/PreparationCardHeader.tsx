"use client";

import { ChevronDown, ChevronUp, ClipboardList, Package } from "lucide-react";

import type { WarehouseService as Service } from "@/lib/warehouse/types";

type Props = {
  service: Service;
  isExpanded: boolean;
  onToggle: () => void;
  stats: { total: number; done: number; percent: number };
};

export function PreparationCardHeader({ service, isExpanded, onToggle, stats }: Props) {
  return (
    <div
      className={`p-8 flex flex-col md:flex-row md:items-center justify-between cursor-pointer transition-colors ${
        isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-6 mb-4 md:mb-0">
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-lg ${
            isExpanded ? "bg-info-solid rotate-6" : "bg-secondary rotate-0"
          }`}
        >
          <ClipboardList
            className={`w-8 h-8 ${isExpanded ? "text-ink-foreground" : "text-muted-foreground"}`}
          />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="bg-info-solid/10 text-info-fg text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-info-solid/20">
              {service.serviceNumber ? `N.º ${service.serviceNumber}` : "Sem n.º"}
              {service.nsi && service.nsi !== "N/A" ? ` · NSI ${service.nsi}` : ""}
            </span>
            <span className="text-muted-foreground text-xs font-black uppercase tracking-widest">
              {new Date(service.createdAt).toLocaleDateString("pt-PT")}
            </span>
          </div>
          <h3 className="ds-title text-2xl tracking-tight text-ink-foreground">{service.title}</h3>
          <p className="text-muted-foreground font-bold flex items-center gap-2 mt-1">
            <Package className="w-4 h-4 text-muted-foreground" /> {service.client}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        {stats.total > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-2">
              Progresso de Fabrico
            </p>
            <div className="flex items-center gap-4">
              <div className="w-32 h-3 bg-secondary rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-info-solid transition-all duration-700 ease-out"
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
              <span className="text-ink-foreground font-black text-sm">
                {stats.done}/{stats.total}
              </span>
            </div>
          </div>
        )}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
            isExpanded
              ? "bg-info-solid/10 border-info-solid text-info-fg"
              : "bg-secondary border-border text-muted-foreground"
          }`}
        >
          {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
        </div>
      </div>
    </div>
  );
}