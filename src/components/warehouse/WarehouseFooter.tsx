"use client";

import { Crown } from "lucide-react";

export default function WarehouseFooter() {
  return (
    <footer className="fixed bottom-0 left-0 w-full glass-panel-light border-t border-slate-200 py-5 px-6 text-center z-40">
      <p className="text-xs text-slate-500 font-black uppercase tracking-[0.4em] flex items-center justify-center gap-2">
        <span>Sistema de Controlo de Produção</span>
        <Crown className="w-3.5 h-3.5 text-[#84cc16]" />
        <span className="text-slate-400">Warehouse v4.0</span>
      </p>
    </footer>
  );
}
