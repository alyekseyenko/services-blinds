import {
  CRM_STAGES,
  CRM_TASK_STATUS,
  isTaskActive,
  isTaskCancelled,
  isTaskCompleted,
  isTaskIncomplete,
  isTaskInProgress,
  isTaskTerminal,
  normalizeString,
  normalizeTaskStatus,
} from "@/lib/crm/contract";
import { isOnboardingDemoEntity } from "@/lib/onboarding/demoMapPin";
import { formatOnSiteServiceDetail } from "@/lib/agendaOnSiteServiceCopy";
import { timelineDetailForDiffEvent } from "@/lib/agendaTimelineCopy";
import type { VisitServiceMode } from "@/lib/schemas";

export type AgendaSnapshotItem = {
  id: string;
  dueAt: string;
  status: string;
  /** Human-readable line for toasts / sininho */
  label: string;
  clientName?: string;
  nsi?: string;
  visitTitle?: string;
  opportunityId?: string;
  technicianName?: string;
  assigneeId?: string;
  onSiteOpportunityIds?: string[];
  onSiteServices?: Array<{
    opportunityId: string;
    serviceType: string;
    mode: VisitServiceMode;
  }>;
  statusNote?: string;
  /** Chave normalizada (INSTALACAO, TIRAR_MEDIDAS, …) para o sininho. */
  serviceType?: string;
};

export type PipelineSnapshotItem = {
  opportunityId: string;
  stage: string;
  label: string;
};

export type AgendaDiffKind =
  | "nova"
  | "reagendada"
  | "cancelada"
  | "concluida"
  | "incompleta"
  | "em_curso"
  | "removida"
  | "reatribuida"
  | "atrasada"
  | "servico_extra"
  | "armazem_pronto"
  | "medicoes_guardadas";

export type AgendaDiffEvent = {
  kind: AgendaDiffKind;
  id: string;
  label: string;
  dueAt?: string;
  status?: string;
  clientName?: string;
  nsi?: string;
  visitTitle?: string;
  opportunityId?: string;
  technicianName?: string;
  detail?: string;
  serviceType?: string;
};

function skipAgendaEntity(id: string): boolean {
  return isOnboardingDemoEntity({ id });
}

/** ISO string for snapshot/diff; empty when date is missing or invalid. */
export function toSafeIso(value: string | Date | null | undefined): string {
  if (value == null) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toISOString();
  } catch {
    return "";
  }
}

export function buildAgendaSnapshotItem(input: {
  id: string;
  dueAt: string;
  status: string;
  client?: string | null;
  nsi?: string | null;
  visitTitle?: string | null;
  opportunityId?: string | null;
  technicianName?: string | null;
  assigneeId?: string | null;
  onSiteOpportunityIds?: string[] | null;
  onSiteServices?: Array<{
    opportunityId: string;
    serviceType: string;
    mode: VisitServiceMode;
  }> | null;
  statusNote?: string | null;
  serviceType?: string | null;
}): AgendaSnapshotItem {
  const client = input.client?.trim() || "";
  const nsiRaw = input.nsi != null ? String(input.nsi).trim() : "";
  const nsi = nsiRaw && nsiRaw !== "N/A" ? nsiRaw : "";
  const title = input.visitTitle?.trim() || "";

  const label =
    [
      client && client !== "Cliente" ? client : null,
      nsi ? `NSI ${nsi}` : null,
      title || null,
    ]
      .filter(Boolean)
      .join(" · ") || client || title || "Visita";

  return {
    id: input.id,
    dueAt: input.dueAt,
    status: input.status,
    label,
    clientName: client || undefined,
    nsi: nsi || undefined,
    visitTitle: title || undefined,
    opportunityId: input.opportunityId?.trim() || undefined,
    technicianName: input.technicianName?.trim() || undefined,
    assigneeId: input.assigneeId?.trim() || undefined,
    onSiteOpportunityIds: input.onSiteOpportunityIds?.length
      ? [...input.onSiteOpportunityIds]
      : undefined,
    onSiteServices: input.onSiteServices?.length ? [...input.onSiteServices] : undefined,
    statusNote: input.statusNote?.trim() || undefined,
    serviceType: input.serviceType?.trim() || undefined,
  };
}

function withEffectiveDueAt(item: AgendaSnapshotItem, prev?: AgendaSnapshotItem): AgendaSnapshotItem {
  if (!isDueAtEmpty(item.dueAt)) return item;
  if (prev && !isDueAtEmpty(prev.dueAt)) return { ...item, dueAt: prev.dueAt };
  return item;
}

function snapshotToEventFields(item: AgendaSnapshotItem): Pick<
  AgendaDiffEvent,
  | "label"
  | "dueAt"
  | "status"
  | "clientName"
  | "nsi"
  | "visitTitle"
  | "opportunityId"
  | "technicianName"
  | "serviceType"
> {
  return {
    label: item.label,
    dueAt: item.dueAt,
    status: item.status,
    clientName: item.clientName,
    nsi: item.nsi,
    visitTitle: item.visitTitle,
    opportunityId: item.opportunityId,
    technicianName: item.technicianName,
    serviceType: item.serviceType,
  };
}

function findOnSiteService(
  item: AgendaSnapshotItem,
  opportunityId: string
): { serviceType: string; mode: VisitServiceMode } | undefined {
  return item.onSiteServices?.find((s) => s.opportunityId === opportunityId);
}

function collectNewOnSiteEvents(
  prev: AgendaSnapshotItem | undefined,
  item: AgendaSnapshotItem
): AgendaDiffEvent[] {
  const prevIds = new Set(prev?.onSiteOpportunityIds ?? []);
  const events: AgendaDiffEvent[] = [];
  for (const oppId of item.onSiteOpportunityIds ?? []) {
    if (prevIds.has(oppId)) continue;
    const svc = findOnSiteService(item, oppId);
    const detail = svc
      ? formatOnSiteServiceDetail(svc.serviceType, svc.mode)
      : undefined;
    events.push({
      kind: "servico_extra",
      id: item.id,
      ...snapshotToEventFields(item),
      opportunityId: oppId,
      detail,
    });
  }
  return events;
}

function formatAgendaWhen(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${date} às ${time}`;
}

function formatTaskStatusLabel(status?: string): string {
  const s = normalizeTaskStatus(status);
  switch (s) {
    case "CONCLUIDO":
    case "DONE":
      return "Concluída";
    case "CANCELADO":
      return "Cancelada";
    case "INCOMPLETO":
      return "Incompleta";
    case "EM_CURSO":
      return "Em curso";
    case "AGENDADO":
      return "Agendada";
    default:
      return status?.trim() || "Estado desconhecido";
  }
}

function sameInstant(a: string, b: string): boolean {
  return new Date(a).getTime() === new Date(b).getTime();
}

function isDueAtEmpty(iso?: string): boolean {
  if (!iso?.trim()) return true;
  return Number.isNaN(new Date(iso).getTime());
}

function terminalKindFromStatus(status?: string): AgendaDiffKind | null {
  if (isTaskCompleted(status)) return "concluida";
  if (isTaskCancelled(status)) return "cancelada";
  if (isTaskIncomplete(status)) return "incompleta";
  return null;
}

function assigneeChanged(prev: AgendaSnapshotItem, item: AgendaSnapshotItem): boolean {
  const a = prev.assigneeId?.trim();
  const b = item.assigneeId?.trim();
  return Boolean(a && b && a !== b && isTaskActive(item.status));
}

export function diffAgendaSnapshots(
  previous: AgendaSnapshotItem[],
  next: AgendaSnapshotItem[]
): AgendaDiffEvent[] {
  const events: AgendaDiffEvent[] = [];
  const prevMap = new Map(previous.filter((p) => !skipAgendaEntity(p.id)).map((p) => [p.id, p]));
  const nextMap = new Map(next.filter((n) => !skipAgendaEntity(n.id)).map((n) => [n.id, n]));

  for (const item of next) {
    if (skipAgendaEntity(item.id)) continue;
    const prev = prevMap.get(item.id);
    if (!prev) {
      if (!isTaskTerminal(item.status)) {
        events.push({ kind: "nova", id: item.id, ...snapshotToEventFields(item) });
      }
      events.push(...collectNewOnSiteEvents(undefined, item));
      continue;
    }

    events.push(...collectNewOnSiteEvents(prev, item));

    if (assigneeChanged(prev, item)) {
      events.push({ kind: "reatribuida", id: item.id, ...snapshotToEventFields(item) });
    }

    if (isTaskCompleted(item.status) && !isTaskCompleted(prev.status)) {
      events.push({
        kind: "concluida",
        id: item.id,
        ...snapshotToEventFields(withEffectiveDueAt(item, prev)),
        detail: timelineDetailForDiffEvent("concluida", item),
      });
      continue;
    }
    if (isTaskIncomplete(item.status) && !isTaskIncomplete(prev.status)) {
      events.push({
        kind: "incompleta",
        id: item.id,
        ...snapshotToEventFields(withEffectiveDueAt(item, prev)),
        detail: timelineDetailForDiffEvent("incompleta", item),
      });
      continue;
    }
    if (isTaskCancelled(item.status) && !isTaskCancelled(prev.status)) {
      events.push({
        kind: "cancelada",
        id: item.id,
        ...snapshotToEventFields(withEffectiveDueAt(item, prev)),
        detail: timelineDetailForDiffEvent("cancelada", item),
      });
      continue;
    }
    if (isTaskInProgress(item.status) && !isTaskInProgress(prev.status)) {
      events.push({
        kind: "em_curso",
        id: item.id,
        ...snapshotToEventFields(item),
        detail: timelineDetailForDiffEvent("em_curso", item),
      });
      continue;
    }

    if (!sameInstant(prev.dueAt, item.dueAt)) {
      const scheduleRemoved = !isDueAtEmpty(prev.dueAt) && isDueAtEmpty(item.dueAt);
      if (scheduleRemoved) {
        events.push({
          kind: "cancelada",
          id: item.id,
          ...snapshotToEventFields({ ...item, dueAt: prev.dueAt }),
        });
      } else if (!isDueAtEmpty(item.dueAt) && !isTaskCancelled(item.status)) {
        events.push({ kind: "reagendada", id: item.id, ...snapshotToEventFields(item) });
      }
    }
  }

  for (const item of previous) {
    if (skipAgendaEntity(item.id)) continue;
    if (nextMap.has(item.id)) continue;

    const inferred = terminalKindFromStatus(item.status);
    if (inferred) {
      continue;
    }

    events.push({ kind: "removida", id: item.id, ...snapshotToEventFields(item) });
  }

  return events;
}

export function diffPipelineSnapshots(
  previous: PipelineSnapshotItem[],
  next: PipelineSnapshotItem[]
): AgendaDiffEvent[] {
  const events: AgendaDiffEvent[] = [];
  const prevMap = new Map(previous.map((p) => [p.opportunityId, p]));
  const prep = normalizeString(CRM_STAGES.PREPARACAO);
  const marcar = normalizeString(CRM_STAGES.MARCAR_INSTALACAO);

  for (const item of next) {
    const prev = prevMap.get(item.opportunityId);
    if (!prev) continue;
    const prevStage = normalizeString(prev.stage);
    const nextStage = normalizeString(item.stage);
    if (prevStage === prep && nextStage === marcar) {
      events.push({
        kind: "armazem_pronto",
        id: item.opportunityId,
        opportunityId: item.opportunityId,
        label: item.label,
        status: item.stage,
      });
    }
  }

  return events;
}

export function formatAgendaDiffToast(event: AgendaDiffEvent): { title: string; description: string } {
  const when = formatAgendaWhen(event.dueAt);
  const who = event.label?.trim() || "Visita";
  const statusLine = event.status ? formatTaskStatusLabel(event.status) : "";

  switch (event.kind) {
    case "nova":
      return {
        title: "Nova visita",
        description: when ? `${who} — ${when}` : who,
      };
    case "reagendada":
      return {
        title: "Visita reagendada",
        description: when ? `${who} — novo horário: ${when}` : who,
      };
    case "cancelada":
      return {
        title: "Visita cancelada",
        description: when
          ? `${who} — ${statusLine || "Cancelada"} · estava marcada para ${when}`
          : `${who} — ${statusLine || "Cancelada"}`,
      };
    case "concluida": {
      const doneLine =
        event.detail?.trim() ||
        (() => {
          const tech = event.technicianName?.trim();
          return tech && tech !== "Não Atribuído"
            ? `${tech} terminou o serviço e saiu do local.`
            : "Serviço concluído — técnico saiu do local.";
        })();
      return {
        title: "Visita concluída",
        description: when ? `${doneLine} — ${who} · ${when}` : `${doneLine} — ${who}`,
      };
    }
    case "incompleta":
      return {
        title: "Visita incompleta",
        description: when
          ? `${who} — ficou incompleta · ${when}`
          : `${who} — ficou incompleta`,
      };
    case "em_curso": {
      const techLine =
        event.detail?.trim() ||
        (() => {
          const tech = event.technicianName?.trim();
          return tech && tech !== "Não Atribuído"
            ? `${tech} chegou ao local.`
            : "Técnico chegou ao local.";
        })();
      return {
        title: "Visita em curso",
        description: when ? `${techLine} — ${who} · ${when}` : `${techLine} — ${who}`,
      };
    }
    case "removida":
      return {
        title: "Visita saiu da agenda",
        description: when
          ? `${who} — ${statusLine ? `${statusLine} · ` : ""}${when}`
          : `${who}${statusLine ? ` — ${statusLine}` : ""}`,
      };
    case "reatribuida": {
      const tech = event.technicianName?.trim();
      const techLine = tech && tech !== "Não Atribuído" ? tech : "outro técnico";
      return {
        title: "Visita reatribuída",
        description: when ? `${who} — ${techLine} · ${when}` : `${who} — ${techLine}`,
      };
    }
    case "atrasada": {
      const tech = event.technicianName?.trim();
      const techLine = tech && tech !== "Não Atribuído" ? tech : "Técnico";
      return {
        title: "Técnico atrasado",
        description: when
          ? `${techLine} — ${who} · estava marcada para ${when}`
          : `${techLine} — ${who}`,
      };
    }
    case "servico_extra":
      return {
        title: "Serviço extra no local",
        description: when ? `${who} — criado durante a visita · ${when}` : `${who} — criado durante a visita`,
      };
    case "armazem_pronto":
      return {
        title: "Armazém concluiu preparação",
        description: who,
      };
    default:
      return { title: "Alteração na agenda", description: when ? `${who} — ${when}` : who };
  }
}
