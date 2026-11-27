"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { serviceTypeConfig } from "@/lib/techniciansConfig";
import { getServiceTypeLegendHint } from "@/lib/map/serviceMarkerArt";
import { MapLegendMarkerPreview } from "@/components/map/MapLegendMarkerPreview";
import { MapLegendRouteStops } from "@/components/map/MapLegendRouteStops";
import { getTechnicianColor, UNASSIGNED_TECHNICIAN_COLOR } from "@/lib/map/taskMarkerDescriptor";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { MAP_BRUTAL_PANEL } from "@/lib/map/mapBrutalChrome";
import { technicianVanDataUrl } from "@/lib/map/technicianVanMarker";
import { APP_LOGO_PATH } from "@/lib/branding";
import {
  MAP_LEGEND_STATUS_ITEMS,
  MAP_LEGEND_TECH_DOT_DETAIL,
  MAP_LEGEND_TECH_DOT_EMPTY,
  MAP_LEGEND_TECH_DOT_TITLE,
  MAP_LEGEND_UNASSIGNED_TECH_DETAIL,
  MAP_LEGEND_UNASSIGNED_TECH_LABEL,
  mapLegendHowToRead,
  type MapLegendVariant,
} from "@/lib/map/mapLegendCopy";

const STORAGE_KEY = "map_legend_open";
const HELP_STORAGE_KEY = "map_legend_help_open";

interface MapLegendProps {
  open: boolean;
  onClose: () => void;
  variant: MapLegendVariant;
  technicianNames?: string[];
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

export function MapLegend({
  open,
  onClose,
  variant,
  technicianNames = [],
}: MapLegendProps) {
  const isDesktop = useMediaMinWidth(768);
  const isWide = useMediaMinWidth(1024);
  const previewSize = isDesktop ? 48 : 40;
  const [helpOpen, setHelpOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(true);
  const [extrasOpen, setExtrasOpen] = useState(true);

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
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            {MAP_LEGEND_TECH_DOT_TITLE}
          </p>
          <p className="mb-2 text-xs font-semibold leading-snug text-muted-foreground">
            {MAP_LEGEND_TECH_DOT_DETAIL}
          </p>
          <ul className="space-y-1.5">
            <li className="flex min-h-10 items-start gap-2">
              <MapLegendMarkerPreview
                typeKey="GERAL"
                label={MAP_LEGEND_UNASSIGNED_TECH_LABEL}
                technicianDot
                technicianColor={UNASSIGNED_TECHNICIAN_COLOR}
                size={32}
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{MAP_LEGEND_UNASSIGNED_TECH_LABEL}</p>
                <p className="text-xs font-semibold leading-snug text-muted-foreground">
                  {MAP_LEGEND_UNASSIGNED_TECH_DETAIL}
                </p>
              </div>
            </li>
            {technicianNames.map((name) => (
              <li key={name} className="flex min-h-10 items-center gap-2">
                <MapLegendMarkerPreview
                  typeKey="GERAL"
                  label={name}
                  technicianDot
                  technicianColor={getTechnicianColor(name)}
                  size={32}
                />
                <span className="min-w-0 truncate text-xs font-bold text-foreground">{name}</span>
              </li>
            ))}
          </ul>
          {technicianNames.length === 0 ? (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">{MAP_LEGEND_TECH_DOT_EMPTY}</p>
          ) : null}
        </div>

        <MapLegendRouteStops previewSize={previewSize} />

        <div className="mt-4 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setStatusOpen((v) => !v)}
            className="flex w-full min-h-12 items-center justify-between gap-2 rounded-xl px-1 text-left text-xs font-black uppercase tracking-wider text-muted-foreground hover:bg-muted"
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
                <li key={item.label} className="flex items-start gap-2.5">
                  <MapLegendMarkerPreview
                    typeKey="INSTALACAO"
                    label={item.label}
                    status={item.status}
                    technicianDot={item.technicianDot}
                    technicianColor={
                      item.technicianColor === "unassigned" ? UNASSIGNED_TECHNICIAN_COLOR : null
                    }
                    size={previewSize}
                  />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-xs font-black text-foreground">{item.label}</p>
                    <p className="text-xs font-semibold leading-snug text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setExtrasOpen((v) => !v)}
            className="flex w-full min-h-12 items-center justify-between gap-2 rounded-xl px-1 text-left text-xs font-black uppercase tracking-wider text-muted-foreground hover:bg-muted"
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
                <img
                  src={technicianVanDataUrl(36)}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 drop-shadow-md"
                  aria-hidden
                />
                <span>Técnico em campo (última posição GPS)</span>
              </li>
              <li className="flex items-center gap-2">
                <img
                  src={APP_LOGO_PATH}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 object-contain drop-shadow-md"
                  aria-hidden
                />
                <span>Sede / armazém</span>
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
