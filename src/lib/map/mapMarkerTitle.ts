import { isNeedsSchedulingStage, isTaskInProgress } from "@/lib/crm/contract";

export type MapMarkerTitleInput = {
  title: string;
  stage?: string | null;
  hasScheduledTask?: boolean;
  scheduledAt?: string | Date | null;
  /** No mapa admin equivale muitas vezes a `createdAt` da oportunidade — não confundir com hora da visita. */
  dueDate?: string | Date | null;
  isLate?: boolean;
  status?: string | null;
};

function formatTimePt(value: string | Date): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

/** Título nativo do Google Maps (hover) — pt-PT, alinhado com emblemas do pino. */
export function buildMapMarkerHoverTitle(task: MapMarkerTitleInput): string {
  const title = task.title?.trim() || "Serviço";
  const isUnscheduled =
    isNeedsSchedulingStage(task.stage) && !task.hasScheduledTask;

  if (isUnscheduled) {
    const created = task.dueDate ? formatTimePt(task.dueDate) : null;
    return created
      ? `Por agendar · criado ${created} · ${title}`
      : `Por agendar · ${title}`;
  }

  if (isTaskInProgress(task.status)) {
    const visit = task.scheduledAt ? formatTimePt(task.scheduledAt) : null;
    return visit ? `Em curso · ${visit} · ${title}` : `Em curso · ${title}`;
  }

  const visitAt = task.scheduledAt;
  const visitTime = visitAt ? formatTimePt(visitAt) : null;

  if (visitTime) {
    if (task.isLate) return `Atrasada · ${visitTime} · ${title}`;
    return `Agendada · ${visitTime} · ${title}`;
  }

  if (task.hasScheduledTask) {
    return `Agendada · ${title}`;
  }

  return title;
}