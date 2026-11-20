"use client";

import { useEffect, useRef, useState } from "react";
import { Satellite, User } from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";
import { MAP_BRUTAL_FLOAT_BTN } from "@/lib/map/mapBrutalChrome";

const DRAG_PX = 12;

export function StreetViewPegman({
  map,
  satellite,
  onToggleSatellite,
  layout = "topRight",
}: {
  map: google.maps.Map | null;
  satellite: boolean;
  onToggleSatellite: () => void;
  /** `stacked` — sem posição absoluta; alinha com os controlos do mapa (técnico). */
  layout?: "topRight" | "stacked";
}) {
  const toast = useToast();
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [lifting, setLifting] = useState(false);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!map) return;
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => undefined;
    overlay.draw = () => undefined;
    overlay.onRemove = () => undefined;
    overlay.setMap(map);
    overlayRef.current = overlay;
    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map]);

  const openAt = (latLng: google.maps.LatLng) => {
    if (!map) return;
    const service = new google.maps.StreetViewService();
    service.getPanorama(
      {
        location: latLng,
        radius: 80,
        source: google.maps.StreetViewSource.OUTDOOR,
      },
      (data, status) => {
        if (status !== google.maps.StreetViewStatus.OK || !data?.location?.pano) {
          toast.warning("Sem vista de rua", "O Google não tem fotos neste sítio.");
          return;
        }
        const streetView = map.getStreetView();
        streetView.setPano(data.location.pano);
        streetView.setVisible(true);
      }
    );
  };

  const dropOnMap = (clientX: number, clientY: number) => {
    if (!map) return;
    const rect = map.getDiv().getBoundingClientRect();
    const point = new google.maps.Point(clientX - rect.left, clientY - rect.top);
    const latLng = overlayRef.current?.getProjection()?.fromContainerPixelToLatLng(point);
    if (!latLng) {
      toast.warning("Sem vista de rua", "Não foi possível ler este ponto do mapa.");
      return;
    }
    openAt(latLng);
  };

  const stackClass =
    layout === "stacked"
      ? "pointer-events-none flex flex-col items-end gap-2"
      : "absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex flex-col gap-2";

  return (
    <>
      <div className={stackClass}>
      <button
        type="button"
        aria-label="Arrastar o boneco para ver a rua"
        title="Arraste para o local"
        className={`pointer-events-auto touch-none transition-transform duration-150 ${MAP_BRUTAL_FLOAT_BTN} ${lifting ? "scale-90 opacity-40" : ""}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
          setLifting(true);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > DRAG_PX) {
            drag.moved = true;
          }
          if (drag.moved) setGhost({ x: event.clientX, y: event.clientY });
        }}
        onPointerUp={(event) => {
          const moved = dragRef.current?.moved ?? false;
          dragRef.current = null;
          setLifting(false);
          setGhost(null);
          if (!moved) {
            toast.info("Vista de rua", "Arraste o boneco verde para o sítio que quer ver.");
            return;
          }
          dropOnMap(event.clientX, event.clientY);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setLifting(false);
          setGhost(null);
        }}
      >
        <User className="h-6 w-6 text-neon" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={satellite}
        aria-label={satellite ? "Voltar ao mapa" : "Vista de satélite"}
        title={satellite ? "Voltar ao mapa" : "Vista de satélite"}
        className={`pointer-events-auto ${MAP_BRUTAL_FLOAT_BTN}`}
        onClick={onToggleSatellite}
      >
        <Satellite className={`h-6 w-6 ${satellite ? "text-neon" : "text-foreground"}`} aria-hidden />
      </button>
      </div>
      {ghost ? (
        <span
          className="pointer-events-none fixed z-30 flex -translate-x-1/2 -translate-y-full flex-col items-center"
          style={{ left: ghost.x, top: ghost.y - 8 }}
        >
          <span className="mb-1 rounded-full border-2 border-border-strong bg-ink px-3 py-1 text-xs font-black text-neon">
            Largue aqui
          </span>
          <span className="flex h-14 w-14 scale-110 items-center justify-center rounded-2xl border-2 border-border-strong bg-primary shadow-xl">
            <User className="h-7 w-7 text-primary-foreground" aria-hidden />
          </span>
          <span className="mt-1 h-4 w-4 rounded-full border-2 border-neon bg-primary/50" aria-hidden />
        </span>
      ) : null}
    </>
  );
}
