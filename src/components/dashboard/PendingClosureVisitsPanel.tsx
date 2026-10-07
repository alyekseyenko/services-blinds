"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/Panel";
import TaskCard from "@/components/dashboard/TaskCard";

type TaskLike = {
  id: string;
  dueDate: Date;
  status?: string;
};

type BannerProps = {
  count: number;
  onOpen: () => void;
};

/** Compact entry on today's agenda — does not mix cards with the day list. */
export function PendingClosureEntryBanner({ count, onOpen }: BannerProps) {
  if (count === 0) return null;

  return (
    <div className="mb-5" data-tour="tech-pending-closure-banner">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full min-h-14 items-center gap-3 rounded-2xl border-2 border-warning-border bg-warning-surface p-4 text-left transition-colors hover:border-border-strong active:scale-[0.99] touch-manipulation"
      >
        <AlertTriangle className="h-6 w-6 shrink-0 text-warning-fg" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-warning-fg">
            Por fechar · dias anteriores
          </p>
          <p className="mt-0.5 text-sm font-semibold text-warning-fg">
            {count === 1
              ? "1 visita sem registo — abra para concluir, marcar incompleta ou cancelar."
              : `${count} visitas sem registo — abra para indicar o que aconteceu.`}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-warning-fg" aria-hidden />
      </button>
    </div>
  );
}

type ListScreenProps = {
  tasks: TaskLike[];
  setSelectedTask: (task: TaskLike) => void;
  onBack: () => void;
};

/** Full-screen list subview inside Lista — separate from the selected day. */
export function PendingClosureListScreen({ tasks, setSelectedTask, onBack }: ListScreenProps) {
  return (
    <div
      className="mx-auto w-full max-w-2xl md:max-w-4xl lg:max-w-6xl"
      data-tour="tech-pending-closure"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <DisplayHeading as="h2" lines={["Por fechar"]} className="text-lg md:text-xl" />
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Visitas de dias anteriores ainda abertas no CRM. Não fazem parte da agenda de hoje.
          </p>
        </div>
        <Button type="button" variant="secondary" size="md" className="shrink-0" onClick={onBack}>
          Voltar à agenda do dia
        </Button>
      </div>

      <Panel
        variant="outline"
        className="mb-5 border-l-4 border-warning-solid bg-warning-surface p-4"
      >
        <p className="text-sm font-semibold text-warning-fg">
          Toque em cada visita e escolha <span className="font-black">Concluído</span>,{" "}
          <span className="font-black">Incompleto</span> ou <span className="font-black">Cancelar</span>{" "}
          com o motivo.
        </p>
      </Panel>

      <div className="space-y-5 md:grid md:grid-cols-2 lg:gap-5 lg:space-y-0">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} setSelectedTask={setSelectedTask} />
        ))}
      </div>
    </div>
  );
}
