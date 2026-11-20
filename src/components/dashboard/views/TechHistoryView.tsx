"use client";

import { History, RefreshCw } from "lucide-react";
import { isTaskCancelled, isTaskCompleted, isTaskIncomplete } from "@/lib/crm/contract";
import { HistoryListFilters } from "@/components/visits/HistoryListFilters";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { Card, CardContent } from "@/components/ui/card";
import { viewPanelStackClass } from "@/lib/ui/viewPanel";
import { cn } from "@/lib/cn";
import type { useHistoryListFilters } from "@/hooks/useHistoryListFilters";
import { historyStatusLabel } from "./techDashboardFormat";

type HistoryTask = {
  id: string;
  status: string;
  client?: string;
  title?: string;
  dueDate: Date;
};

export function TechHistoryView({
  active,
  historyFilters,
  filteredHistoryTasks,
  historyTasks,
  pendingCount,
  failedCount,
  onOpenSyncQueue,
  setSelectedTask,
}: {
  active: boolean;
  historyFilters: ReturnType<typeof useHistoryListFilters>;
  filteredHistoryTasks: HistoryTask[];
  historyTasks: HistoryTask[];
  pendingCount: number;
  failedCount: number;
  onOpenSyncQueue: () => void;
  setSelectedTask: (task: HistoryTask) => void;
}) {
  return (
    <div
      data-tour="tech-history"
      className={viewPanelStackClass(
        active,
        "absolute inset-0 overflow-y-auto custom-scrollbar scroll-pb-[max(5rem,calc(env(safe-area-inset-bottom)+4rem))] scroll-pt-2 p-4 pb-8 md:p-6 lg:px-8"
      )}
      aria-hidden={!active}
    >
      <div className="mx-auto w-full max-w-2xl md:max-w-4xl lg:max-w-6xl">
        <div className="mb-8 flex flex-col">
          <DisplayHeading as="h2" lines={["Histórico"]} seal="asterisk" />
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Concluídos, cancelados e incompletos
          </p>
          <div className="mt-4">
            <HistoryListFilters
              datePreset={historyFilters.datePreset}
              onDatePresetChange={historyFilters.setPreset}
              from={historyFilters.from}
              to={historyFilters.to}
              onFromChange={historyFilters.setFrom}
              onToChange={historyFilters.setTo}
              outcomes={historyFilters.outcomes}
              onToggleOutcome={historyFilters.toggleOutcome}
              onClear={historyFilters.clear}
              resultCount={filteredHistoryTasks.length}
              totalCount={historyTasks.length}
            />
          </div>
        </div>

        <button
          type="button"
          data-tour="tech-history-sync-queue"
          onClick={onOpenSyncQueue}
          className={cn(
            "mb-6 flex w-full min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-5 py-4 text-left transition-colors active:scale-[0.99]",
            pendingCount + failedCount > 0
              ? "border-warning-solid bg-warning-surface hover:bg-warning-surface dark:border-warning-border dark:bg-ink/30 dark:hover:bg-ink/50"
              : "border-border-strong bg-card hover:bg-muted"
          )}
        >
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-black uppercase tracking-tight",
                pendingCount + failedCount > 0
                  ? "text-warning-fg dark:text-warning-fg"
                  : "text-foreground"
              )}
            >
              Fila offline
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs font-semibold",
                pendingCount + failedCount > 0
                  ? "text-warning-fg/80 dark:text-warning-fg/80"
                  : "text-muted-foreground"
              )}
            >
              {pendingCount + failedCount > 0
                ? `${pendingCount + failedCount} alteração(ões) por sincronizar`
                : "Nada por enviar — ver fila local"}
            </p>
          </div>
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              pendingCount + failedCount > 0
                ? "bg-warning-surface/80 text-warning-fg dark:bg-warning-surface dark:text-warning-fg"
                : "bg-muted text-muted-foreground"
            )}
          >
            <RefreshCw className="h-5 w-5" aria-hidden />
          </span>
        </button>

        {filteredHistoryTasks.length === 0 ? (
          <Card className="py-20 text-center">
            <CardContent className="flex flex-col items-center">
              <History className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm font-bold text-muted-foreground">
                {historyFilters.isFiltered
                  ? "Nenhum serviço neste filtro."
                  : "Nenhum serviço recente no histórico."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 md:grid md:grid-cols-2 lg:gap-4 lg:space-y-0">
            {filteredHistoryTasks.map((task) => {
              const isTaskComp = isTaskCompleted(task.status);
              const isTaskCanc = isTaskCancelled(task.status);
              const isTaskInc = isTaskIncomplete(task.status);
              return (
                <Card
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="cursor-pointer transition-all [content-visibility:auto] [contain-intrinsic-size:auto_96px] hover:border-primary active:scale-[0.99]"
                >
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${
                          isTaskComp
                            ? "bg-primary/15 text-primary-ink"
                            : isTaskCanc
                              ? "bg-danger-solid/15 text-danger-solid"
                              : isTaskInc
                                ? "bg-warning-solid/15 text-warning-solid"
                                : "bg-secondary/80 text-muted-foreground"
                        }`}
                      >
                        <History className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                          {task.client || task.title}
                        </p>
                        {task.client && task.title && task.title !== task.client ? (
                          <p className="mt-0.5 line-clamp-1 text-xs font-medium text-muted-foreground">
                            {task.title}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {task.dueDate.toLocaleDateString("pt-PT", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`self-start rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide sm:self-center ${
                        isTaskComp
                          ? "border-2 border-border-strong bg-primary text-primary-foreground"
                          : isTaskCanc
                            ? "border-2 border-border-strong bg-danger-solid text-ink-foreground"
                            : isTaskInc
                              ? "border-2 border-border-strong bg-warning-solid text-primary-foreground"
                              : "border-2 border-border-strong bg-primary text-primary-foreground"
                      }`}
                    >
                      {historyStatusLabel(task.status)}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}