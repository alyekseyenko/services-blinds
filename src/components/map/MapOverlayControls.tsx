"use client";

import { useState } from "react";
import {
  Crosshair,
  Group,
  Layers,
  MapPin,
  Maximize2,
  SlidersHorizontal,
  Ungroup,
  X,
} from "lucide-react";
import { useBackToClose } from "@/hooks/useBackToClose";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";

interface MapOverlayControlsProps {
  variant: "admin" | "technician";
  legendOpen: boolean;
  onToggleLegend: () => void;
  onFitBounds: () => void;
  onRecenter: () => void;
  recenterLabel: string;
  clusteringAvailable?: boolean;
  clusteringEnabled?: boolean;
  onToggleClustering?: () => void;
  locationSharingEnabled?: boolean;
  onToggleLocationSharing?: () => void;
}

export function MapOverlayControls({
  variant,
  legendOpen,
  onToggleLegend,
  onFitBounds,
  onRecenter,
  recenterLabel,
  clusteringAvailable = false,
  clusteringEnabled = true,
  onToggleClustering,
  locationSharingEnabled = true,
  onToggleLocationSharing,
}: MapOverlayControlsProps) {
  const isDesktop = useMediaMinWidth(768);
  const compact = variant === "technician" && !isDesktop;
  const [menuOpen, setMenuOpen] = useState(false);

  useBackToClose(menuOpen, () => setMenuOpen(false), "tech-map-controls-menu");

  const bottomClass =
    variant === "technician"
      ? "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))]"
      : "bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))] lg:bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))]";

  const btnClass =
    "flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border border-border/90 bg-card/95 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-card active:scale-95";

  const rowClass =
    "flex w-full min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-foreground transition-colors hover:bg-muted active:bg-muted";

  const closeMenu = () => setMenuOpen(false);

  const run = (fn: () => void) => {
    fn();
    closeMenu();
  };

  if (compact) {
    return (
      <div
        className={`pointer-events-none absolute right-3 z-20 ${bottomClass} md:right-4`}
        aria-label="Controlos do mapa"
        data-tour="tech-map-controls"
      >
        {menuOpen ? (
          <button
            type="button"
            className="pointer-events-auto fixed inset-0 z-10 bg-ink/20 backdrop-blur-[1px]"
            aria-label="Fechar menu do mapa"
            onClick={closeMenu}
          />
        ) : null}
        {menuOpen ? (
          <div
            className="pointer-events-auto absolute bottom-14 right-0 z-20 w-[min(17.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border/90 bg-card/98 shadow-2xl backdrop-blur"
            role="menu"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <p className="text-xs font-black uppercase tracking-wider text-foreground">
                Controlos do mapa
              </p>
              <button
                type="button"
                onClick={closeMenu}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="p-1.5">
              <button
                type="button"
                role="menuitem"
                className={rowClass}
                onClick={() => run(onFitBounds)}
              >
                <Maximize2 className="h-5 w-5 shrink-0 text-neon" aria-hidden />
                Ajustar aos pinos
              </button>
              <button
                type="button"
                role="menuitem"
                className={rowClass}
                onClick={() => run(onRecenter)}
              >
                <Crosshair className="h-5 w-5 shrink-0 text-foreground" aria-hidden />
                {recenterLabel}
              </button>
              {clusteringAvailable && onToggleClustering ? (
                <button
                  type="button"
                  role="menuitem"
                  className={rowClass}
                  onClick={() => run(onToggleClustering)}
                  aria-pressed={clusteringEnabled}
                >
                  {clusteringEnabled ? (
                    <Group className="h-5 w-5 shrink-0 text-neon" aria-hidden />
                  ) : (
                    <Ungroup className="h-5 w-5 shrink-0 text-foreground" aria-hidden />
                  )}
                  {clusteringEnabled ? "Agrupar pinos (ativo)" : "Mostrar cada pino"}
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className={`${rowClass} ${legendOpen ? "bg-primary/10" : ""}`}
                onClick={() => {
                  onToggleLegend();
                  closeMenu();
                }}
                aria-expanded={legendOpen}
              >
                <Layers className="h-5 w-5 shrink-0 text-foreground" aria-hidden />
                Legenda
              </button>
              {onToggleLocationSharing ? (
                <button
                  type="button"
                  role="menuitem"
                  className={rowClass}
                  onClick={() => run(onToggleLocationSharing)}
                >
                  <MapPin
                    className={`h-5 w-5 shrink-0 ${locationSharingEnabled ? "text-neon" : "text-warning-solid"}`}
                    aria-hidden
                  />
                  {locationSharingEnabled ? "Pausar partilha GPS" : "Ligar GPS de volta"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={`pointer-events-auto ${btnClass} ${menuOpen ? "ring-2 ring-primary/50" : ""}`}
          title="Controlos do mapa"
          aria-label="Controlos do mapa"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <SlidersHorizontal className="h-5 w-5 text-foreground" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none absolute right-3 z-20 flex flex-col gap-2 ${bottomClass} md:right-4`}
      aria-label="Controlos do mapa"
      data-tour={variant === "admin" ? "admin-map-controls" : "tech-map-controls"}
    >
      <button
        type="button"
        onClick={onFitBounds}
        className={`pointer-events-auto ${btnClass}`}
        title="Ajustar aos pinos"
        aria-label="Ajustar aos pinos"
      >
        <Maximize2 className="h-5 w-5 text-neon" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onRecenter}
        className={`pointer-events-auto ${btnClass}`}
        title={recenterLabel}
        aria-label={recenterLabel}
      >
        <Crosshair className="h-5 w-5 text-foreground" aria-hidden />
      </button>
      {clusteringAvailable && onToggleClustering ? (
        <button
          type="button"
          onClick={onToggleClustering}
          className={`pointer-events-auto ${btnClass} ${clusteringEnabled ? "ring-2 ring-primary/50" : ""}`}
          title={
            clusteringEnabled
              ? "Agrupar pinos por zona (ativo)"
              : "Mostrar cada pino separado"
          }
          aria-label={
            clusteringEnabled
              ? "Desativar agrupamento de pinos"
              : "Ativar agrupamento de pinos por zona"
          }
          aria-pressed={clusteringEnabled}
        >
          {clusteringEnabled ? (
            <Group className="h-5 w-5 text-neon" aria-hidden />
          ) : (
            <Ungroup className="h-5 w-5 text-foreground" aria-hidden />
          )}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onToggleLegend}
        className={`pointer-events-auto ${btnClass} ${legendOpen ? "ring-2 ring-primary/50" : ""}`}
        title="Legenda"
        aria-label="Legenda do mapa"
        aria-expanded={legendOpen}
      >
        <Layers className="h-5 w-5 text-foreground" aria-hidden />
      </button>
    </div>
  );
}
