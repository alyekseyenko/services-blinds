import {
  CRM_TASK_STATUS,
  isTaskInProgress,
  normalizeTaskStatus,
} from "@/lib/crm/contract";
import type { ScheduleForm } from "@/lib/admin/scheduleForm";
import type { Opportunity, WorkspaceMember } from "@/types/admin";

export type ScheduleModalMode = "new" | "reschedule";

export function getTaskIdForReschedule(
  taskId?: string | null,
  taskStatus?: string | null
): string | undefined {
  if (!taskId) return undefined;
  const status = normalizeTaskStatus(taskStatus);
  if (
    status === CRM_TASK_STATUS.CANCELADO ||
    status === CRM_TASK_STATUS.POR_AGENDAR ||
    status === CRM_TASK_STATUS.AGENDADO
  ) {
    return taskId;
  }
  return undefined;
}

export function canOpenRescheduleModal(opp: Opportunity): boolean {
  if (!opp.hasScheduledTask || !opp.taskId) return false;
  if (isTaskInProgress(opp.taskStatus)) return false;
  return Boolean(getTaskIdForReschedule(opp.taskId, opp.taskStatus ?? opp.status));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTimeInput(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function resolveTechnicianMemberId(
  opp: Opportunity,
  members: WorkspaceMember[]
): string {
  if (opp.technicianId) {
    const byId = members.find((m) => m.id === opp.technicianId);
    if (byId?.id) return byId.id;
  }
  const name = opp.technician?.trim();
  if (!name || /não atribuído/i.test(name)) return "";
  const byName = members.find(
    (m) => m.name?.localeCompare(name, "pt-PT", { sensitivity: "accent" }) === 0
  );
  return byName?.id ?? "";
}

export function buildScheduleFormPrefill(
  opp: Opportunity,
  members: WorkspaceMember[],
  mode: ScheduleModalMode
): ScheduleForm {
  const scheduled =
    opp.scheduledAt instanceof Date
      ? opp.scheduledAt
      : opp.scheduledAt
        ? new Date(opp.scheduledAt)
        : null;
  const end =
    opp.scheduledEndAt instanceof Date
      ? opp.scheduledEndAt
      : opp.scheduledEndAt
        ? new Date(opp.scheduledEndAt)
        : null;

  const date =
    mode === "reschedule" && scheduled && !Number.isNaN(scheduled.getTime())
      ? formatDateInput(scheduled)
      : "";
  const time =
    mode === "reschedule" && scheduled && !Number.isNaN(scheduled.getTime())
      ? formatTimeInput(scheduled)
      : "09:00";
  const endTime =
    mode === "reschedule" && end && !Number.isNaN(end.getTime()) ? formatTimeInput(end) : "";

  return {
    title: `Visita Técnica - ${opp.title}`,
    date,
    time,
    endTime,
    technicianId: mode === "reschedule" ? resolveTechnicianMemberId(opp, members) : "",
    assistantTechnicianIds: opp.assistantTechnicianIds ?? [],
    assistantTechnicianNames: opp.assistantTechnicianNames ?? [],
    urgent: false,
    notes: opp.report || "",
    addressStreet1: opp.rawAddress?.addressStreet1 || "",
    addressStreet2: opp.rawAddress?.addressStreet2 || "",
    addressCity: opp.rawAddress?.addressCity || "",
    addressState: opp.rawAddress?.addressState || "",
    addressPostcode: opp.rawAddress?.addressPostcode || "",
    addressCountry: opp.rawAddress?.addressCountry || "Portugal",
    addressLat: opp.coordinates ? opp.coordinates[0] : null,
    addressLng: opp.coordinates ? opp.coordinates[1] : null,
  };
}

export type AgendaScheduleMutationKind = "reagendada" | "reatribuida" | "equipa_atualizada";

export function localAgendaKindsForSchedule(
  opp: Opportunity,
  dueAt: Date,
  newTechnicianMemberId: string,
  reschedule: boolean,
  newAssistantIds: string[] = []
): AgendaScheduleMutationKind[] {
  if (!reschedule) {
    return ["reagendada"];
  }
  const kinds: AgendaScheduleMutationKind[] = [];
  const prevDue = opp.scheduledAt
    ? opp.scheduledAt instanceof Date
      ? opp.scheduledAt
      : new Date(opp.scheduledAt)
    : null;
  if (prevDue && !Number.isNaN(prevDue.getTime()) && prevDue.getTime() !== dueAt.getTime()) {
    kinds.push("reagendada");
  }
  const prevTechId = opp.technicianId ?? "";
  if (newTechnicianMemberId && prevTechId && newTechnicianMemberId !== prevTechId) {
    kinds.push("reatribuida");
  } else if (
    newTechnicianMemberId &&
    opp.technician &&
    !/não atribuído/i.test(opp.technician) &&
    newTechnicianMemberId !== prevTechId
  ) {
    kinds.push("reatribuida");
  }
  const prevAssistants = [...(opp.assistantTechnicianIds ?? [])].sort().join("|");
  const nextAssistants = [...newAssistantIds].sort().join("|");
  if (kinds.length === 0) kinds.push("reagendada");
  if (
    prevAssistants !== nextAssistants &&
    newTechnicianMemberId === (opp.technicianId ?? "") &&
    !kinds.includes("reatribuida")
  ) {
    kinds.push("equipa_atualizada");
  }
  return kinds;
}