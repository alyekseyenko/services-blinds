"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Map as MapIcon, Calendar, History, User } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/cn";
import { searchOpportunities } from "@/lib/admin/opportunitySearch";
import type { Opportunity } from "@/types/admin";

interface AdminCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: "map" | "calendar" | "history") => void;
  onSearch: (query: string) => void;
  onSelectOpportunity: (opp: Opportunity) => void;
  opportunities: Opportunity[];
  technicians: string[];
  onSelectTechnician: (name: string) => void;
}

export default function AdminCommandPalette({
  open,
  onClose,
  onNavigate,
  onSearch,
  onSelectOpportunity,
  opportunities,
  technicians,
  onSelectTechnician,
}: AdminCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

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

  const trimmed = query.trim();
  const showServiceResults = trimmed.length >= 2;

  const serviceResults = useMemo(
    () => (showServiceResults ? searchOpportunities(opportunities, trimmed, 10) : []),
    [showServiceResults, opportunities, trimmed]
  );

  const filteredTechs = useMemo(() => {
    if (!trimmed) return technicians.slice(0, 8);
    return technicians.filter((t) => t.toLowerCase().includes(trimmed.toLowerCase()));
  }, [technicians, trimmed]);

  const showNav = !showServiceResults;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-scrim p-4 pt-24 "
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed) {
                e.preventDefault();
                if (serviceResults.length === 1) {
                  onSelectOpportunity(serviceResults[0]);
                  onClose();
                  return;
                }
                onSearch(trimmed);
                onClose();
              }
            }}
            placeholder="NSI, cliente, morada, técnico…"
            className="h-12 min-h-12 flex-1 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Pesquisar serviços"
          />
          <kbd className="hidden rounded-lg border border-border px-2 py-1 text-xs font-bold text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {showServiceResults && (
            <>
              <p className="px-3 py-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                Serviços
                {serviceResults.length > 0 ? ` · ${serviceResults.length}` : ""}
              </p>
              {serviceResults.length === 0 ? (
                <p className="px-3 py-4 text-sm font-semibold text-muted-foreground">
                  Nenhum serviço encontrado. Prima Enter para filtrar no mapa.
                </p>
              ) : (
                serviceResults.map((opp) => (
                  <button
                    key={opp.twentyId || opp.id}
                    type="button"
                    onClick={() => {
                      onSelectOpportunity(opp);
                      onClose();
                    }}
                    className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-3 text-left hover:bg-muted"
                  >
                    <span className="text-sm font-black uppercase tracking-tight text-foreground">
                      {opp.client || "Cliente"}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {[opp.nsi, opp.title].filter(Boolean).join(" · ")}
                    </span>
                    {opp.address ? (
                      <span className="line-clamp-1 text-xs text-muted-foreground">{opp.address}</span>
                    ) : null}
                  </button>
                ))
              )}
            </>
          )}

          {showNav && (
            <>
              <p className="px-3 py-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                Navegação
              </p>
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
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-foreground hover:bg-muted"
                >
                  <item.icon className="h-4 w-4 text-neon" aria-hidden />
                  {item.label}
                </button>
              ))}
            </>
          )}

          {filteredTechs.length > 0 && (
            <>
              <p className="mt-2 px-3 py-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                Técnicos
              </p>
              {filteredTechs.slice(0, 8).map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => {
                    onSelectTechnician(tech);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-foreground hover:bg-muted"
                  )}
                >
                  <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {tech}
                </button>
              ))}
            </>
          )}

          {trimmed.length > 0 && trimmed.length < 2 && (
            <p className="px-3 py-3 text-xs font-semibold text-muted-foreground">
              Escreva pelo menos 2 caracteres para pesquisar serviços.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
