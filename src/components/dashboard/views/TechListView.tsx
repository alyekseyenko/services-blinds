"use client";

import type { Ref } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { Marquee } from "@/components/ui/Marquee";
import TaskCard from "@/components/dashboard/TaskCard";
import {
  PendingClosureEntryBanner,
  PendingClosureListScreen,
} from "@/components/dashboard/PendingClosureVisitsPanel";
import { viewPanelStackClass } from "@/lib/ui/viewPanel";
import { formatPtDate } from "./techDashboardFormat";

type AgendaTask = Parameters<typeof TaskCard>[0]["task"];

export function TechListView({
  active,
  scrollContainerRef,
  listPendingClosureOpen,
  pendingClosureTasks,
  setSelectedTask,
  onClosePendingClosure,
  onOpenPendingClosure,
  clientHydrated,
  calendarDate,
  dayTasks,
  shiftCalendarDay,
  listShowsToday,
  onJumpToToday,
}: {
  active: boolean;
  scrollContainerRef: Ref<HTMLDivElement>;
  listPendingClosureOpen: boolean;
  pendingClosureTasks: AgendaTask[];
  setSelectedTask: (task: AgendaTask) => void;
  onClosePendingClosure: () => void;
  onOpenPendingClosure: () => void;
  clientHydrated: boolean;
  calendarDate: Date;
  dayTasks: AgendaTask[];
  shiftCalendarDay: (delta: number) => void;
  listShowsToday: boolean;
  onJumpToToday: () => void;
}) {
  return (
    <div
      ref={scrollContainerRef}
      data-tour="tech-list-agenda"
      className={viewPanelStackClass(
        active,
        "absolute inset-0 touch-manipulation overflow-y-auto overscroll-contain custom-scrollbar scroll-pb-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))] scroll-pt-2 p-4 pb-8 md:p-6 lg:px-8"
      )}
      aria-hidden={!active}
    >
      <div className="mx-auto w-full max-w-2xl md:max-w-4xl lg:max-w-6xl">
        {listPendingClosureOpen ? (
          <PendingClosureListScreen
            tasks={pendingClosureTasks}
            setSelectedTask={setSelectedTask}
            onBack={onClosePendingClosure}
          />
        ) : (
          <>
            <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <DisplayHeading as="h2" lines={["Agenda"]} className="text-lg md:text-xl" />
                <p className="text-xs font-semibold text-muted-foreground" suppressHydrationWarning>
                  {formatPtDate(clientHydrated, calendarDate, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                  {" · "}
                  {dayTasks.length} visita{dayTasks.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex w-full touch-manipulation items-center justify-between gap-2 rounded-xl border-2 border-border-strong bg-card p-1.5 sm:w-auto">
                <button
                  type="button"
                  onClick={() => shiftCalendarDay(-1)}
                  className="min-h-12 rounded-xl px-4 text-xs font-bold text-muted-foreground transition-all hover:bg-muted hover:text-primary-ink active:bg-muted"
                >
                  Voltar
                </button>
                <div
                  className="min-w-[120px] px-4 text-center text-xs font-black uppercase tracking-widest text-foreground"
                  suppressHydrationWarning
                >
                  {formatPtDate(clientHydrated, calendarDate, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => shiftCalendarDay(1)}
                  className="min-h-12 rounded-xl px-4 text-xs font-bold text-muted-foreground transition-all hover:bg-muted hover:text-primary-ink active:bg-muted"
                >
                  Avançar
                </button>
              </div>
            </div>

            {listShowsToday && (
              <PendingClosureEntryBanner count={pendingClosureTasks.length} onOpen={onOpenPendingClosure} />
            )}

            {dayTasks.length === 0 ? (
              <div className="overflow-hidden rounded-2xl border-2 border-border-strong bg-card py-12 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-xl border-2 border-border-strong bg-muted">
                  <CalendarIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-tight text-muted-foreground">
                  Sem visitas agendadas para hoje
                </h3>
                <button
                  type="button"
                  onClick={onJumpToToday}
                  className="mt-4 text-xs font-black uppercase tracking-widest text-primary-ink transition-colors hover:text-foreground"
                >
                  Voltar para o dia de hoje
                </button>
                <div className="mt-8">
                  <Marquee segments={["Agenda", "Campo", "Sync"]} />
                </div>
              </div>
            ) : (
              <div className="space-y-5 md:grid md:grid-cols-2 lg:gap-5 lg:space-y-0">
                {dayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} setSelectedTask={setSelectedTask} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}