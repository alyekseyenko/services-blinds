"use client";

import { useEffect, useState } from "react";
import { Search, Map as MapIcon, Calendar, History } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/cn";

interface AdminCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: "map" | "calendar" | "history") => void;
  onSearch: (query: string) => void;
  technicians: string[];
  onSelectTechnician: (name: string) => void;
}

export default function AdminCommandPalette({
  open,
  onClose,
  onNavigate,
  onSearch,
  technicians,
  onSelectTechnician,
}: AdminCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!open) {
          // Parent toggles open state
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  const filteredTechs = technicians.filter((t) => t.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-950/60 p-4 pt-24 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                onSearch(query.trim());
                onClose();
              }
            }}
            placeholder="Pesquisar NSI, cliente, técnico..."
            className="h-12 flex-1 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 sm:inline">Esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          <p className="px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-500">Navegação</p>
          {[
            { id: "map" as const, label: "Mapa", icon: MapIcon },
            { id: "calendar" as const, label: "Agenda", icon: Calendar },
            { id: "history" as const, label: "Histórico", icon: History },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-100"
            >
              <item.icon className="h-4 w-4 text-[#84cc16]" />
              {item.label}
            </button>
          ))}

          {filteredTechs.length > 0 && (
            <>
              <p className="mt-2 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-500">Técnicos</p>
              {filteredTechs.slice(0, 8).map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => {
                    onSelectTechnician(tech);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-100"
                  )}
                >
                  {tech}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
