"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { UnscheduledWithoutGps } from "@/lib/admin/zoneInsights";
import { withoutGpsHeading, withoutGpsIdentity } from "@/lib/admin/mapFiltersBarHelpers";

export function AdminMapWithoutGpsBox(props: {
  withoutGpsCount: number;
  withoutGpsServices: UnscheduledWithoutGps[];
  onSelectWithoutGps?: (twentyId: string) => void;
  onGeocodeWithoutGps?: (twentyId: string) => Promise<void> | void;
  onSaveWithoutGpsCoords?: (twentyId: string, lat: string, lng: string) => Promise<void> | void;
  onSyncAddresses: () => void;
  isSyncing: boolean;
}) {
  const {
    withoutGpsCount,
    withoutGpsServices,
    onSelectWithoutGps,
    onGeocodeWithoutGps,
    onSaveWithoutGpsCoords,
    onSyncAddresses,
    isSyncing,
  } = props;

  const [openGpsId, setOpenGpsId] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [gpsBusyId, setGpsBusyId] = useState<string | null>(null);

  if (withoutGpsCount <= 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-warning-border bg-warning-surface/90 p-3 space-y-2">
      <p className="text-xs font-black uppercase text-warning-fg">
        {withoutGpsCount} serviços sem GPS nas sugestões
      </p>
      {withoutGpsServices.length > 0 ? (
        <ul className="space-y-2">
          {withoutGpsServices.map((svc) => {
            const open = openGpsId === svc.twentyId;
            return (
              <li key={svc.twentyId} className="rounded-lg border border-warning-border/60 bg-warning-surface">
                <button
                  type="button"
                  onClick={() => {
                    setOpenGpsId(open ? null : svc.twentyId);
                    setManualLat("");
                    setManualLng("");
                  }}
                  className="w-full min-h-12 px-2 py-1.5 text-left"
                >
                  <span className="block truncate text-xs font-bold text-warning-fg">
                    {withoutGpsHeading(svc)}
                  </span>
                  {withoutGpsIdentity(svc) ? (
                    <span className="block truncate text-xs font-medium text-warning-fg">
                      {withoutGpsIdentity(svc)}
                    </span>
                  ) : null}
                  <span className="block truncate text-xs font-medium text-warning-fg opacity-90">
                    {svc.address}
                  </span>
                </button>
                {open ? (
                  <div className="space-y-2 border-t border-warning-border/50 px-2 pb-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={gpsBusyId === svc.twentyId}
                        onClick={() => {
                          void (async () => {
                            setGpsBusyId(svc.twentyId);
                            try {
                              await onGeocodeWithoutGps?.(svc.twentyId);
                            } finally {
                              setGpsBusyId(null);
                            }
                          })();
                        }}
                        className="min-h-12 flex-1 rounded-lg bg-warning-solid px-2 text-xs font-black uppercase text-ink-foreground disabled:opacity-60"
                      >
                        {gpsBusyId === svc.twentyId ? "A procurar…" : "Tentar GPS"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectWithoutGps?.(svc.twentyId)}
                        className="min-h-12 rounded-lg border border-warning-border px-3 text-xs font-bold text-warning-fg"
                      >
                        Ficha
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={manualLat}
                        onChange={(event) => setManualLat(event.target.value)}
                        placeholder="Latitude"
                        className="ds-input min-h-12 flex-1 px-2 text-xs"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={manualLng}
                        onChange={(event) => setManualLng(event.target.value)}
                        placeholder="Longitude"
                        className="ds-input min-h-12 flex-1 px-2 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!manualLat.trim() || !manualLng.trim()}
                      onClick={() => onSaveWithoutGpsCoords?.(svc.twentyId, manualLat, manualLng)}
                      className="min-h-12 w-full rounded-lg border border-warning-border bg-card text-xs font-black uppercase text-foreground disabled:opacity-50"
                    >
                      Guardar coordenadas
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="text-xs font-medium leading-snug text-warning-fg opacity-90">
        Toque no serviço para tentar o GPS ou escrever a latitude e a longitude. Sem pin, a zona não entra
        nas sugestões.
      </p>
      <button
        type="button"
        onClick={onSyncAddresses}
        disabled={isSyncing}
        className="flex w-full min-h-12 items-center justify-center gap-2 rounded-lg bg-warning-solid text-xs font-black uppercase text-ink-foreground disabled:opacity-60"
      >
        {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Sincronizar moradas
      </button>
    </div>
  );
}