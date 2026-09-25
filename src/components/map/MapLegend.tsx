"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { serviceTypeConfig } from "@/lib/techniciansConfig";
import { getServiceTypeLegendHint } from "@/lib/map/serviceMarkerArt";
import { MapLegendMarkerPreview } from "@/components/map/MapLegendMarkerPreview";

const STORAGE_KEY = "map_legend_open";
const HELP_STORAGE_KEY = "map_legend_help_open";

interface MapLegendProps {
  open: boolean;
  onClose: () => void;
  variant: "admin" | "technician";
}

const STATUS_ITEMS: { label: string; status: "late" | "done" | "unscheduled" }[] = [
  { label: "Atrasada", status: "late" },
  { label: "Concluída", status: "done" },
  { label: "Por agendar", status: "unscheduled" },
];

export function useMapLegendOpen(variant: "admin" | "technician") {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setOpen(true);
      else if (stored === "0") setOpen(false);
      else if (variant === "admin") {
        const desktop =
          typeof window !== "undefined" &&
          window.matchMedia("(min-width: 1024px)").matches;
        setOpen(desktop);
      }
    } catch {
      /* ignore */
    }
  }, [variant]);

  const setLegendOpen = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return { legendOpen: open, setLegendOpen };
}

export function MapLegend({ open, onClose, variant }: MapLegendProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HELP_STORAGE_KEY);
      if (stored === "1") setHelpOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleHelp = () => {
    setHelpOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HELP_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (!open) return null;

  const bottomClass =
    variant === "technician"
      ? "bottom-[max(11rem,calc(env(safe-area-inset-bottom)+9rem))]"
      : "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] lg:bottom-20";

  const types = Object.entries(serviceTypeConfig).filter(
    ([key]) => key !== "GERAL" && key !== "REAGENDAR"
  );

  return (
    <div
      className={`pointer-events-auto absolute left-3 right-3 z-20 max-h-[min(60dvh,28rem)] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur custom-scrollbar md:left-auto md:right-4 md:max-h-[50vh] md:w-80 ${bottomClass}`}
      role="dialog"
      aria-label="Legenda do mapa"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-slate-900">Legenda</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          aria-label="Fechar legenda"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        Tipos de serviço
      </p>
      <ul className="space-y-2.5">
        {types.map(([key, cfg]) => (
          <li key={key} className="flex items-center gap-3">
            <MapLegendMarkerPreview typeKey={key} label={cfg.label} />
            <div className="min-w-0 text-xs leading-snug">
              <p className="font-black text-slate-900">{cfg.label}</p>
              <p className="font-semibold text-slate-600">{getServiceTypeLegendHint(key)}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
        Estados (emblema no pino)
      </p>
      <ul className="space-y-2">
        {STATUS_ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-3">
            <MapLegendMarkerPreview typeKey="INSTALACAO" label={item.label} status={item.status} />
            <span className="text-xs font-semibold text-slate-700">{item.label}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500" />
          Agendada (sem emblema)
        </li>
      </ul>

      <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
        Outros pinos
      </p>
      <ul className="space-y-2 text-xs font-semibold text-slate-700">
        <li className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#84cc16] bg-[#090d16] text-[10px] font-black text-[#84cc16]"
            aria-hidden
          >
            Van
          </span>
          Técnico em campo
        </li>
        <li className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-[10px] font-black text-slate-700"
            aria-hidden
          >
            HQ
          </span>
          Sede / armazém
        </li>
      </ul>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={toggleHelp}
          className="flex w-full min-h-11 items-center justify-between gap-2 rounded-xl px-2 text-left text-xs font-black uppercase tracking-wider text-slate-800 hover:bg-slate-50"
          aria-expanded={helpOpen}
        >
          Como ler o mapa
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${helpOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {helpOpen && (
          <p className="mt-2 text-xs leading-snug text-slate-600">
            <span className="font-bold text-slate-800">Cor do alfinete</span> = tipo;{" "}
            <span className="font-bold text-slate-800">letras no disco branco</span> (ex.{" "}
            <span className="font-black text-sky-700">MD</span> = medidas,{" "}
            <span className="font-black text-emerald-700">IN</span> = instalação).{" "}
            <span className="font-bold text-slate-800">Emblema</span> = estado (ex.:{" "}
            <span className="text-red-600">!</span> = atrasada).{" "}
            <span className="font-bold text-slate-800">Hora da visita</span> só ao tocar no pino.{" "}
            Círculos com número = agrupamento (botão à direita do mapa). Filtros avançados: tipos
            múltiplos, técnico e histórico no painel{" "}
            <span className="font-bold text-slate-800">Filtros</span>.
          </p>
        )}
      </div>
    </div>
  );
}
