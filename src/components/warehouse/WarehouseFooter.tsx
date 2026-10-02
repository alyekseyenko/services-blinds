"use client";

import { Crown } from "lucide-react";

export default function WarehouseFooter() {
  return (
    <footer className="fixed bottom-0 left-0 w-full brutal-panel border-t border-border py-5 px-6 text-center z-40">
      <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.4em] flex items-center justify-center gap-2">
        <span>Sistema de Controlo de Produção</span>
        <Crown className="w-3.5 h-3.5 text-primary-ink" />
        <span className="text-muted-foreground">Armazém v4.0</span>
      </p>
    </footer>
  );
}
