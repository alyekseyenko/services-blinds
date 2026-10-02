"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { serviceTypeConfig } from "@/lib/techniciansConfig";
import { getServiceTypeLegendHint } from "@/lib/map/serviceMarkerArt";
import { MapLegendMarkerPreview } from "@/components/map/MapLegendMarkerPreview";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";

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
  const isDesktop = useMediaMinWidth(768);
  const compact = variant === "technician" && !isDesktop;
  const previewSize = compact ? 36 : 48;
  const [helpOpen, setHelpOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(!compact);
  const [extrasOpen, setExtrasOpen] = useState(false);

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
      ? compact
        ? "bottom-[max(10rem,calc(env(safe-area-inset-bottom)+8rem))]"
        : "bottom-[max(11rem,calc(env(safe-area-inset-bottom)+9rem))]"
      : "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] lg:bottom-20";

  const types = Object.entries(serviceTypeConfig).filter(
    ([key]) => key !== "GERAL" && key !== "REAGENDAR"
  );

  return (
    <div
      className={`pointer-events-auto absolute left-3 right-3 z-20 overflow-y-auto rounded-2xl border border-border/90 bg-card/95 shadow-xl backdrop-blur custom-scrollbar md:left-auto md:right-4 md:w-80 ${
        compact
          ? "max-h-[min(36dvh,16.5rem)] p-3"
          : "max-h-[min(60dvh,28rem)] p-4 md:max-h-[50vh]"
      } ${bottomClass}`}
      role="dialog"
      aria-label="Legenda do mapa"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-foreground">Legenda</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Fechar legenda"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Tipos de serviço
      </p>
      <ul className={compact ? "space-y-1.5" : "space-y-2.5"}>
        {types.map(([key, cfg]) => (
          <li key={key} className="flex items-center gap-2.5">
            <MapLegendMarkerPreview typeKey={key} label={cfg.label} size={previewSize} />
            <div className="min-w-0 text-xs leading-snug">
              <p className="font-black text-foreground">{cfg.label}</p>
              {!compact ? (
                <p className="font-semibold text-muted-foreground">{getServiceTypeLegendHint(key)}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className={compact ? "mt-2 border-t border-border pt-2" : "mt-4 border-t border-border pt-3"}>
        <button
          type="button"
          onClick={() => setStatusOpen((v) => !v)}
          className="flex w-full min-h-10 items-center justify-between gap-2 rounded-xl px-1 text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:bg-muted"
          aria-expanded={statusOpen}
        >
          Estados no pino
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${statusOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {statusOpen ? (
          <ul className="mt-1 space-y-1.5">
            {STATUS_ITEMS.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5">
                <MapLegendMarkerPreview
                  typeKey="INSTALACAO"
                  label={item.label}
                  status={item.status}
                  size={previewSize}
                />
                <span className="text-xs font-semibold text-foreground">{item.label}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success-solid" />
              Agendada (sem emblema)
            </li>
          </ul>
        ) : null}
      </div>

      <div className={compact ? "mt-2 border-t border-border pt-2" : "mt-4"}>
        <button
          type="button"
          onClick={() => setExtrasOpen((v) => !v)}
          className="flex w-full min-h-10 items-center justify-between gap-2 rounded-xl px-1 text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:bg-muted"
          aria-expanded={extrasOpen}
        >
          Outros pinos
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${extrasOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {extrasOpen ? (
          <ul className="mt-1 space-y-1.5 text-xs font-semibold text-foreground">
            <li className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-ink text-[10px] font-black text-neon"
                aria-hidden
              >
                Carr.
              </span>
              Técnico em campo
            </li>
            <li className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-[10px] font-black text-foreground"
                aria-hidden
              >
                Sede
              </span>
              Sede / armazém
            </li>
          </ul>
        ) : null}
      </div>

      <div className={`border-t border-border pt-2 ${compact ? "mt-2" : "mt-4"}`}>
        <button
          type="button"
          onClick={toggleHelp}
          className="flex w-full min-h-12 items-center justify-between gap-2 rounded-xl px-2 text-left text-xs font-black uppercase tracking-wider text-foreground hover:bg-muted"
          aria-expanded={helpOpen}
        >
          Como ler o mapa
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${helpOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {helpOpen && (
          <p className="mt-2 text-xs leading-snug text-muted-foreground">
            <span className="font-bold text-foreground">Cor do alfinete</span> = tipo;{" "}
            <span className="font-bold text-foreground">letras no disco branco</span> (ex.{" "}
            <span className="font-black text-info-fg">MD</span> = medidas,{" "}
            <span className="font-black text-success-fg">IN</span> = instalação).{" "}
            <span className="font-bold text-foreground">Emblema</span> = estado (ex.:{" "}
            <span className="text-danger-solid">!</span> = atrasada).{" "}
            <span className="font-bold text-foreground">Hora da visita</span> só ao tocar no pino.{" "}
            Círculos com número = agrupamento (botão à direita do mapa). Filtros avançados: tipos
            múltiplos, técnico e histórico no painel{" "}
            <span className="font-bold text-foreground">Filtros</span>.
          </p>
        )}
      </div>
    </div>
  );
}
