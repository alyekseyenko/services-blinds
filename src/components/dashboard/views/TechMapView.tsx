"use client";

import type { Ref } from "react";
import dynamic from "next/dynamic";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { viewPanelStackClass } from "@/lib/ui/viewPanel";
import { formatPtDate } from "@/components/dashboard/views/techDashboardFormat";
import { MapSkeleton } from "@/components/ui/Skeleton";
import { getHqLocation } from "@/lib/hq";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const HQ_LOCATION = getHqLocation();

export function TechMapView(props: {
  active: boolean;
  mapViewRef: Ref<HTMLDivElement>;
  clientHydrated: boolean;
  calendarDate: Date;
  dayTasks: any[];
  dayOverdueCount: number;
  shiftCalendarDay: (delta: number) => void;
  setCalendarDate: (date: Date) => void;
  setMapAutoFitScope: (scope: "all" | "overdue") => void;
  setMapFitNonce: React.Dispatch<React.SetStateAction<number>>;
  mapFitNonce: number;
  mapAutoFitScope: "all" | "overdue";
  selectedTask: any | null;
  mapVisitSidePanel: boolean;
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
  isOnline: boolean;
  locationSharingActive: boolean;
  onToggleLocationSharing: () => void;
  onTaskSelect: (task: any) => void;
}) {
  const {
    active,
    mapViewRef,
    clientHydrated,
    calendarDate,
    dayTasks,
    dayOverdueCount,
    shiftCalendarDay,
    setCalendarDate,
    setMapAutoFitScope,
    setMapFitNonce,
    mapFitNonce,
    mapAutoFitScope,
    selectedTask,
    mapVisitSidePanel,
    userLocation,
    isOnline,
    locationSharingActive,
    onToggleLocationSharing,
    onTaskSelect,
  } = props;

  return (
    <div
      ref={mapViewRef}
      className={viewPanelStackClass(active, "absolute inset-0 flex min-h-0 flex-col")}
      aria-hidden={!active}
    >
      <div className="pointer-events-none absolute top-2 left-2 right-2 z-10 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="pointer-events-auto flex min-h-12 w-full min-w-0 items-center gap-1 rounded-xl border-2 border-border-strong bg-card px-1.5 py-1 touch-manipulation sm:flex-1"
          data-tour="tech-map-day"
        >
          <button
            type="button"
            onClick={() => shiftCalendarDay(-1)}
            className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted active:bg-muted"
            aria-label="Dia anterior"
          >
            ◀
          </button>

          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center sm:flex-row sm:flex-wrap sm:gap-1">
            <div className="flex min-w-0 items-center justify-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span
                className="truncate text-xs font-bold capitalize text-foreground"
                suppressHydrationWarning
              >
                {formatPtDate(clientHydrated, calendarDate, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                · {dayTasks.length}
              </span>
            </div>
            {dayOverdueCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMapAutoFitScope("overdue");
                  setMapFitNonce((n) => n + 1);
                }}
                className="max-w-full truncate rounded-full border border-warning-border bg-warning-surface px-2 py-0.5 text-xs font-black text-warning-fg hover:bg-warning-surface"
              >
                {dayOverdueCount} atrasada{dayOverdueCount > 1 ? "s" : ""}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => shiftCalendarDay(1)}
            className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted active:bg-muted"
            aria-label="Dia seguinte"
          >
            ▶
          </button>
        </div>

        {calendarDate.toDateString() !== new Date().toDateString() && (
          <button
            type="button"
            onClick={() => setCalendarDate(new Date())}
            className="pointer-events-auto min-h-12 w-full shrink-0 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-md touch-manipulation sm:w-auto"
          >
            Hoje
          </button>
        )}
      </div>

      <div
        className={cn(
          "relative min-h-0 flex-1 border-2 border-border-strong bg-background transition-[margin] duration-200 md:m-2 md:rounded-2xl md:overflow-hidden",
          active &&
            selectedTask &&
            mapVisitSidePanel &&
            "md:mr-[min(28rem,calc(42vw+0.5rem))] lg:mr-[33rem]"
        )}
        data-tour="tech-map-canvas"
      >
        <MapComponent
          tasks={dayTasks}
          onTaskSelect={onTaskSelect}
          markerInteraction="popup"
          autoFitKey={`${calendarDate.toDateString()}-${mapFitNonce}`}
          autoFitScope={mapAutoFitScope}
          userLocation={userLocation}
          hqLocation={HQ_LOCATION}
          isTechnicianView
          isOnline={isOnline}
          locationSharingEnabled={locationSharingActive}
          onToggleLocationSharing={onToggleLocationSharing}
        />
      </div>

      {dayTasks.length === 0 && isOnline && (
        <div className="pointer-events-none absolute inset-x-4 top-20 z-10 flex justify-center">
          <p className="rounded-2xl border-2 border-border-strong bg-card px-4 py-3 text-center text-sm font-bold text-foreground shadow-lg">
            Sem visitas neste dia — use as setas para mudar o dia.
          </p>
        </div>
      )}
    </div>
  );
}