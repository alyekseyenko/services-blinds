"use client";

import { cn } from "@/lib/cn";
import type { RouteData } from "@/types/admin";

export function RouteFuelInputs({
  fuelPrice,
  setFuelPrice,
  fuelConsumption,
  setFuelConsumption,
  tollCost,
  setTollCost,
  realRouteData,
}: {
  fuelPrice: number;
  setFuelPrice: (v: number) => void;
  fuelConsumption: number;
  setFuelConsumption: (v: number) => void;
  tollCost: number;
  setTollCost: (v: number) => void;
  realRouteData: RouteData | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="text-xs font-black uppercase tracking-wide text-muted-foreground">
        Preço gasolina (€/L)
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={fuelPrice}
          onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 0)}
          className="mt-1 w-full rounded-lg border border-border bg-muted px-2 py-2.5 text-xs font-bold text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30/20"
        />
      </label>
      <label className="text-xs font-black uppercase tracking-wide text-muted-foreground">
        Consumo (L/100 km)
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={fuelConsumption}
          onChange={(e) => setFuelConsumption(parseFloat(e.target.value) || 0)}
          className="mt-1 w-full rounded-lg border border-border bg-muted px-2 py-2.5 text-xs font-bold text-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30/20"
        />
      </label>
      <label className="col-span-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
        <span className="flex items-center justify-between gap-2">
          Portagens total (€)
          {realRouteData?.hasTolls && (
            <span className="rounded-md border border-warning-border bg-warning-surface px-1.5 py-0.5 text-xs font-black uppercase text-warning-fg">
              Portagens detetadas
            </span>
          )}
        </span>
        <div className="relative mt-1">
          <input
            type="number"
            step="0.5"
            inputMode="decimal"
            value={tollCost}
            onChange={(e) => setTollCost(parseFloat(e.target.value) || 0)}
            className={cn(
              "w-full rounded-lg border px-2 py-2.5 pr-20 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30/20",
              realRouteData?.hasTolls
                ? "border-warning-border bg-warning-surface/40 text-warning-fg focus:border-warning-solid"
                : "border-border bg-muted text-foreground focus:border-primary focus:bg-card"
            )}
          />
          {realRouteData?.hasTolls && tollCost === 0 && (
            <button
              type="button"
              onClick={() => setTollCost(Math.round(realRouteData.distanceKm * 0.08))}
              className="absolute right-1 top-1 bottom-1 rounded-md bg-warning-solid px-2.5 text-xs font-black uppercase text-ink-foreground hover:bg-warning-solid/90"
            >
              Estimar
            </button>
          )}
        </div>
      </label>
    </div>
  );
}