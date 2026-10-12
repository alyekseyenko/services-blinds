"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { serviceTypeConfig } from "@/lib/techniciansConfig";
import { getServiceTypeLegendHint } from "@/lib/map/serviceMarkerArt";
import { MapLegendMarkerPreview } from "@/components/map/MapLegendMarkerPreview";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { MAP_BRUTAL_PANEL } from "@/lib/map/mapBrutalChrome";
import {
  MAP_LEGEND_STATUS_ITEMS,
  mapLegendHowToRead,
  type MapLegendVariant,
} from "@/lib/map/mapLegendCopy";

const STORAGE_KEY = "map_legend_open";
const HELP_STORAGE_KEY = "map_legend_help_open";

interface MapLegendProps {
  open: boolean;
  onClose: () => void;
  variant: MapLegendVariant;
}

export function useMapLegendOpen(variant: MapLegendVariant) {
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
  const isWide = useMediaMinWidth(1024);
  const previewSize = isDesktop ? 48 : 40;
  const [helpOpen, setHelpOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(true);
  const [extrasOpen, setExtrasOpen] = useState(variant === "technician");

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
      ? "bottom-[max(9.5rem,calc(env(safe-area-inset-bottom)+7.5rem))] sm:bottom-[max(10.5rem,calc(env(safe-area-inset-bottom)+8.5rem))]"
      : "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] lg:bottom-20";

  const panelMaxHeight =
    variant === "technician"
      ? isWide
        ? "max-h-[min(70dvh,32rem)]"
        : "max-h-[min(78dvh,36rem)]"
      : isWide
        ? "max-h-[min(65dvh,30rem)] md:max-h-[min(55vh,28rem)]"
        : "max-h-[min(75dvh,34rem)]";

  const types = Object.entries(serviceTypeConfig).filter(
    ([key]) => key !== "GERAL" && key !== "REAGENDAR"
  );

  const helpLines = mapLegendHowToRead(variant);

  return (
    <div
      className={`pointer-events-auto absolute inset-x-2 z-20 flex max-w-lg flex-col overflow-hidden ${MAP_BRUTAL_PANEL} ${panelMaxHeight} sm:inset-x-auto sm:right-4 sm:w-[min(100%,22rem)] md:w-80 ${bottomClass}`}
      role="dialog"
      aria-label="Legenda do mapa"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
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

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-3 py-3 sm:px-4 sm:py-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Tipos de serviço
        </p>
        <ul className="space-y-2.5">
          {types.map(([key, cfg]) => (
            <li key={key} className="flex items-start gap-2.5">
              <MapLegendMarkerPreview typeKey={key} label={cfg.label} size={previewSize} />
              <div className="min-w-0 flex-1 text-xs leading-snug">
                <p className="font-black text-foreground">{cfg.label}</p>
                <p className="font-semibold text-muted-foreground">{getServiceTypeLegendHint(key)}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setStatusOpen((v) => !v)}
            className="flex w-full min-h-12 items-center justify-between gap-2 rounded-xl px-1 text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:bg-muted"
            aria-expanded={statusOpen}
          >
            Estados no pino
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${statusOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {statusOpen ? (
            <ul className="mt-2 space-y-2">
              {MAP_LEGEND_STATUS_ITEMS.map((item) => (
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

        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setExtrasOpen((v) => !v)}
            className="flex w-full min-h-12 items-center justify-between gap-2 rounded-xl px-1 text-left text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:bg-muted"
            aria-expanded={extrasOpen}
          >
            Outros pinos
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${extrasOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {extrasOpen ? (
            <ul className="mt-2 space-y-2 text-xs font-semibold text-foreground">
              <li className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-ink text-[10px] font-black text-neon"
                  aria-hidden
                >
                  Carr.
                </span>
                Técnico em campo (última posição GPS)
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-[10px] font-black text-foreground"
                  aria-hidden
                >
                  Sede
                </span>
                Sede / armazém
              </li>
              {variant === "technician" ? (
                <li className="flex items-center gap-2 pl-10 text-muted-foreground">
                  Ponto azul = sua posição (quando o GPS está activo)
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <div className="mt-3 border-t border-border pt-3">
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
          {helpOpen ? (
            <ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground marker:text-muted-foreground">
              {helpLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
