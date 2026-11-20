"use client";

export function MapOptimizedRouteOverlay(props: {
  directions: google.maps.DirectionsResult;
  fuelPrice: number;
  fuelConsumption: number;
}) {
  const { directions, fuelPrice, fuelConsumption } = props;
  const legs = directions.routes[0]?.legs ?? [];
  const totalSecs = legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0);
  const totalMeters = legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0);
  const durationLabel =
    totalSecs / 60 > 60
      ? `${Math.floor(totalSecs / 3600)}h ${Math.round((totalSecs % 3600) / 60)}min`
      : `${Math.round(totalSecs / 60)} min`;
  const distanceKm = (totalMeters / 1000).toFixed(1);
  const fuelCost = ((totalMeters / 1000) * (fuelConsumption / 100) * fuelPrice).toFixed(2);

  return (
    <div className="absolute bottom-6 left-6 bg-ink/95 backdrop-blur shadow-2xl rounded-2xl p-4 border border-border-strong z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 text-ink-foreground">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-success-solid p-2 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <div className="text-xs font-bold text-success-solid uppercase tracking-wider">
            Tempo total (Google Maps)
          </div>
          <div className="text-xl font-black text-ink-foreground">{durationLabel}</div>
        </div>
      </div>
      <div className="flex gap-4 border-t border-border pt-2">
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase">Distância</div>
          <div className="text-sm font-bold text-muted-foreground">{distanceKm} km</div>
        </div>
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase">Custo Combustível</div>
          <div className="text-sm font-bold text-success-solid">{fuelCost}€</div>
        </div>
      </div>
    </div>
  );
}