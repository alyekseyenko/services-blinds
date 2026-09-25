"use client";

import { Crosshair, Group, Layers, Maximize2, Ungroup } from "lucide-react";

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
}: MapOverlayControlsProps) {
  const bottomClass =
    variant === "technician"
      ? "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))]"
      : "bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] lg:bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))]";

  const btnClass =
    "flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border border-slate-200/90 bg-white/95 text-slate-800 shadow-lg backdrop-blur transition-colors hover:bg-white";

  return (
    <div
      className={`pointer-events-none absolute right-3 z-20 flex flex-col gap-2 ${bottomClass} md:right-4`}
      aria-label="Controlos do mapa"
    >
      <button
        type="button"
        onClick={onFitBounds}
        className={`pointer-events-auto ${btnClass}`}
        title="Ajustar aos pinos"
        aria-label="Ajustar aos pinos"
      >
        <Maximize2 className="h-5 w-5 text-[#84cc16]" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onRecenter}
        className={`pointer-events-auto ${btnClass}`}
        title={recenterLabel}
        aria-label={recenterLabel}
      >
        <Crosshair className="h-5 w-5 text-slate-700" aria-hidden />
      </button>
      {clusteringAvailable && onToggleClustering ? (
        <button
          type="button"
          onClick={onToggleClustering}
          className={`pointer-events-auto ${btnClass} ${clusteringEnabled ? "ring-2 ring-[#84cc16]/50" : ""}`}
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
            <Group className="h-5 w-5 text-[#84cc16]" aria-hidden />
          ) : (
            <Ungroup className="h-5 w-5 text-slate-700" aria-hidden />
          )}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onToggleLegend}
        className={`pointer-events-auto ${btnClass} ${legendOpen ? "ring-2 ring-[#84cc16]/50" : ""}`}
        title="Legenda"
        aria-label="Legenda do mapa"
        aria-expanded={legendOpen}
      >
        <Layers className="h-5 w-5 text-slate-700" aria-hidden />
      </button>
    </div>
  );
}
