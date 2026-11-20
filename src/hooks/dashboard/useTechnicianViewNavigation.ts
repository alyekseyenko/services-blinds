"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { View } from "react-big-calendar";
import { useViewSwitchCover } from "@/hooks/useViewSwitchCover";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useSwipeDayChange } from "@/hooks/useSwipeDayChange";
import {
  useSwipeEdgeViewChange,
  type EdgeViewSwipeHint,
} from "@/hooks/useSwipeEdgeViewChange";
import { TECH_MAIN_VIEWS, adjacentTechMainView } from "@/lib/techMainViews";
import {
  listenMainViewPop,
  readMainViewFromUrl,
  writeMainViewToUrl,
} from "@/lib/urlMainView";
import { useCalendarMidnightRollover } from "@/hooks/useCalendarMidnightRollover";
import { hapticLight } from "@/lib/haptics";
import { useToast } from "@/components/ui/ToastContext";

type TechnicianToast = ReturnType<typeof useToast>;

export function useTechnicianViewNavigation(params: {
  selectedTask: any | null;
  setSelectedTask: (task: any | null) => void;
  calendarDate: Date;
  setCalendarDate: React.Dispatch<React.SetStateAction<Date>>;
  loading: boolean;
  refreshTasksFromServer: () => Promise<void>;
  toast: TechnicianToast;
}) {
  const {
    selectedTask,
    setSelectedTask,
    calendarDate,
    setCalendarDate,
    loading,
    refreshTasksFromServer,
    toast,
  } = params;

  const listShowsToday = calendarDate.toDateString() === new Date().toDateString();

  const [view, setView] = useState(() =>
    typeof window !== "undefined" ? readMainViewFromUrl(TECH_MAIN_VIEWS, "map") : "map"
  );
  const viewSwitchCover = useViewSwitchCover(view);
  const [viewSlideDir, setViewSlideDir] = useState<0 | 1 | -1>(0);
  const [edgeSwipeHint, setEdgeSwipeHint] = useState<EdgeViewSwipeHint>({ phase: "idle" });
  const [mapFitNonce, setMapFitNonce] = useState(0);
  const [mapAutoFitScope, setMapAutoFitScope] = useState<"all" | "overdue">("all");
  const [calendarView, setCalendarView] = useState<View>("month");
  const [listPendingClosureOpen, setListPendingClosureOpen] = useState(false);

  const listScrollRef = useRef<HTMLDivElement>(null);
  const mapViewRef = useRef<HTMLDivElement>(null);
  const calendarViewRef = useRef<HTMLDivElement>(null);
  const mainShellRef = useRef<HTMLDivElement>(null);
  const pullNudgeRef = useRef<HTMLDivElement>(null);
  const [pullNudgeEl, setPullNudgeEl] = useState<HTMLElement | null>(null);
  const [listScrollEl, setListScrollEl] = useState<HTMLElement | null>(null);
  const [calendarScrollEl, setCalendarScrollEl] = useState<HTMLElement | null>(null);
  const [mainShellEl, setMainShellEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMapAutoFitScope("all");
  }, [calendarDate.toDateString()]);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setCalendarView("agenda");
    }
  }, []);

  useEffect(() => {
    writeMainViewToUrl(view, true);
  }, []);

  useEffect(() => {
    return listenMainViewPop((next) => {
      if (!next || !TECH_MAIN_VIEWS.includes(next as (typeof TECH_MAIN_VIEWS)[number])) return;
      setView((current) => {
        if (current === next) return current;
        setSelectedTask(null);
        return next;
      });
    });
  }, [setSelectedTask]);

  useEffect(() => {
    if (view !== "list") setListPendingClosureOpen(false);
  }, [view]);

  useEffect(() => {
    if (!listShowsToday) setListPendingClosureOpen(false);
  }, [listShowsToday]);

  const shiftCalendarDay = useCallback((delta: number) => {
    setCalendarDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }, []);

  const shiftCalendarStep = useCallback(
    (delta: number) => {
      setCalendarDate((prev) => {
        const d = new Date(prev);
        if (calendarView === "month") {
          d.setMonth(d.getMonth() + delta);
        } else if (calendarView === "week") {
          d.setDate(d.getDate() + delta * 7);
        } else {
          d.setDate(d.getDate() + delta);
        }
        return d;
      });
    },
    [calendarView]
  );

  const resetCalendarToToday = useCallback(() => {
    setCalendarDate(new Date());
  }, []);
  useCalendarMidnightRollover(resetCalendarToToday);

  const { pullDistance, armed, isRefreshing } = usePullToRefresh({
    enabled: view === "list" && !loading,
    scrollElement: listScrollEl,
    nudgeElement: pullNudgeEl,
    onOfflineAttempt: () => {
      toast.warning("Sem rede", "Não é possível atualizar a agenda offline.");
    },
    onRefresh: async () => {
      await refreshTasksFromServer();
    },
  });

  const goPreviousDay = useCallback(() => shiftCalendarDay(-1), [shiftCalendarDay]);
  const goNextDay = useCallback(() => shiftCalendarDay(1), [shiftCalendarDay]);
  const goPreviousCalendarStep = useCallback(() => shiftCalendarStep(-1), [shiftCalendarStep]);
  const goNextCalendarStep = useCallback(() => shiftCalendarStep(1), [shiftCalendarStep]);

  useSwipeDayChange({
    enabled: view === "list" && !selectedTask,
    onPreviousDay: goPreviousDay,
    onNextDay: goNextDay,
    targetElement: listScrollEl,
  });

  useSwipeDayChange({
    enabled: view === "calendar" && !selectedTask,
    onPreviousDay: goPreviousCalendarStep,
    onNextDay: goNextCalendarStep,
    targetElement: calendarScrollEl,
  });

  const changeMainView = useCallback(
    (nextView: string, slideDir?: 1 | -1) => {
      if (nextView === view) return;
      const fromIdx = TECH_MAIN_VIEWS.indexOf(view as (typeof TECH_MAIN_VIEWS)[number]);
      const toIdx = TECH_MAIN_VIEWS.indexOf(nextView as (typeof TECH_MAIN_VIEWS)[number]);
      if (toIdx < 0) return;
      const dir =
        slideDir ?? (fromIdx >= 0 && toIdx > fromIdx ? 1 : fromIdx >= 0 && toIdx < fromIdx ? -1 : 0);
      setViewSlideDir(dir);
      setView(nextView);
      setSelectedTask(null);
      writeMainViewToUrl(nextView);
      hapticLight();
    },
    [view, setSelectedTask]
  );

  const shiftMainView = useCallback(
    (delta: number) => {
      const next = adjacentTechMainView(view, delta);
      if (!next) return;
      changeMainView(next, delta > 0 ? 1 : -1);
    },
    [view, changeMainView]
  );

  useEffect(() => {
    if (viewSlideDir === 0) return;
    const timer = window.setTimeout(() => setViewSlideDir(0), 340);
    return () => window.clearTimeout(timer);
  }, [view, viewSlideDir]);

  useSwipeEdgeViewChange({
    enabled: !selectedTask && view !== "map",
    currentView: view,
    onViewChange: (next) => changeMainView(next),
    targetElement: mainShellEl,
    onHint: setEdgeSwipeHint,
  });

  const viewPanelDragStyle =
    edgeSwipeHint.phase === "dragging"
      ? {
          transform: `translate3d(${
            edgeSwipeHint.direction === "next"
              ? -Math.min(edgeSwipeHint.progress, 1) * 24
              : Math.min(edgeSwipeHint.progress, 1) * 24
          }px, 0, 0)`,
        }
      : undefined;

  return {
    view,
    setView,
    viewSwitchCover,
    viewSlideDir,
    edgeSwipeHint,
    calendarDate,
    setCalendarDate,
    mapFitNonce,
    setMapFitNonce,
    mapAutoFitScope,
    setMapAutoFitScope,
    calendarView,
    setCalendarView,
    listPendingClosureOpen,
    setListPendingClosureOpen,
    listScrollRef,
    mapViewRef,
    calendarViewRef,
    mainShellRef,
    pullNudgeRef,
    setPullNudgeEl,
    setListScrollEl,
    setCalendarScrollEl,
    setMainShellEl,
    pullDistance,
    armed,
    isRefreshing,
    shiftCalendarDay,
    changeMainView,
    shiftMainView,
    viewPanelDragStyle,
  };
}