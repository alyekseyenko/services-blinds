import { CRM_TASK_CLIENT_AVAILABILITY, CRM_TASK_STATUS } from "./schema";

// ==========================================
// 7. UTILITIES
// ==========================================
export function normalizeString(str?: string | null): string {
  return (str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function normalizeTaskStatus(status?: string | null): string {
  return normalizeString(status).replace(/\s+/g, '_');
}

/** Valores aceites pelo enum `status` de tasks no Twenty (pt-PT). */
export const TWENTY_TASK_STATUS_VALUES = [
  CRM_TASK_STATUS.INCOMPLETO,
  CRM_TASK_STATUS.CONCLUIDO,
  CRM_TASK_STATUS.CANCELADO,
  CRM_TASK_STATUS.AGENDADO,
  CRM_TASK_STATUS.POR_AGENDAR,
  "REMEDICAO",
  CRM_TASK_STATUS.EM_CURSO,
] as const;

const TWENTY_TASK_STATUS_WRITE_ALIASES: Record<string, string> = {
  DONE: CRM_TASK_STATUS.CONCLUIDO,
  COMPLETED: CRM_TASK_STATUS.CONCLUIDO,
  SCHEDULED: CRM_TASK_STATUS.AGENDADO,
  CANCELLED: CRM_TASK_STATUS.CANCELADO,
  CANCELED: CRM_TASK_STATUS.CANCELADO,
  INCOMPLETE: CRM_TASK_STATUS.INCOMPLETO,
  IN_PROGRESS: CRM_TASK_STATUS.EM_CURSO,
  TO_SCHEDULE: CRM_TASK_STATUS.POR_AGENDAR,
  UNSCHEDULED: CRM_TASK_STATUS.POR_AGENDAR,
};

/** Estado para mutações GraphQL — nunca enviar aliases em inglês (ex. DONE). */
export function toTwentyTaskStatus(status: string): string {
  const normalized = normalizeTaskStatus(status);
  const mapped = TWENTY_TASK_STATUS_WRITE_ALIASES[normalized] ?? normalized;
  if ((TWENTY_TASK_STATUS_VALUES as readonly string[]).includes(mapped)) {
    return mapped;
  }
  return mapped;
}

export function clientAvailabilityForStatus(
  status: string
): (typeof CRM_TASK_CLIENT_AVAILABILITY)[keyof typeof CRM_TASK_CLIENT_AVAILABILITY] | undefined {
  const normalized = normalizeTaskStatus(status);
  if (normalized === CRM_TASK_STATUS.POR_AGENDAR) {
    return CRM_TASK_CLIENT_AVAILABILITY.AWAITING_RESPONSE;
  }
  if (normalized === CRM_TASK_STATUS.AGENDADO) {
    return CRM_TASK_CLIENT_AVAILABILITY.CLIENT_CAN;
  }
  return undefined;
}

export function isTaskActive(status?: string | null): boolean {
  const s = normalizeTaskStatus(status);
  return s === CRM_TASK_STATUS.AGENDADO || s === CRM_TASK_STATUS.EM_CURSO;
}

/** Proposal sent to client; awaiting confirmation before the visit is firm. */
export function isTaskPendingConfirmation(status?: string | null): boolean {
  return normalizeTaskStatus(status) === CRM_TASK_STATUS.POR_AGENDAR;
}

/** Visits the client may cancel through the public portal. */
export function canClientCancelTask(status?: string | null): boolean {
  const s = normalizeTaskStatus(status);
  return (
    s === CRM_TASK_STATUS.POR_AGENDAR ||
    s === CRM_TASK_STATUS.AGENDADO ||
    s === CRM_TASK_STATUS.EM_CURSO
  );
}

/** Blocks technician calendar slots (proposed or confirmed visits). */
export function isTaskBlockingSchedule(status?: string | null): boolean {
  const s = normalizeTaskStatus(status);
  return (
    s === CRM_TASK_STATUS.POR_AGENDAR ||
    s === CRM_TASK_STATUS.AGENDADO ||
    s === CRM_TASK_STATUS.EM_CURSO
  );
}

/** Reuse an existing CRM task when re-proposing after cancel or updating a pending proposal. */
export function getReusableTaskId(
  taskId?: string | null,
  taskStatus?: string | null
): string | undefined {
  if (!taskId) return undefined;
  const status = normalizeTaskStatus(taskStatus);
  if (
    status === CRM_TASK_STATUS.CANCELADO ||
    status === CRM_TASK_STATUS.POR_AGENDAR
  ) {
    return taskId;
  }
  return undefined;
}

export function isTaskInProgress(status?: string | null): boolean {
  return normalizeTaskStatus(status) === CRM_TASK_STATUS.EM_CURSO;
}

export const TWENTY_ROLE_LABELS = {
  ADMIN: 'Admin',
  MEMBER: 'Member',
  TECHNICIANS: 'Técnicos',
  CEO: 'CEO',
  WAREHOUSE: 'Armazem',
} as const;

export type AppRole = 'admin' | 'member' | 'technician' | 'warehouse' | 'ceo';

export const TWENTY_ROLE_TO_APP_ROLE: Record<string, AppRole> = {
  ADMIN: 'admin',
  MEMBER: 'member',
  TECNICOS: 'technician',
  TECNICO: 'technician',
  CEO: 'ceo',
  ARMAZEM: 'warehouse',
};

export const APP_ROLE_HOME: Record<AppRole, string> = {
  admin: '/admin',
  member: '/admin',
  technician: '/dashboard',
  warehouse: '/armazem',
  ceo: '/ceo',
};

export function mapTwentyRoleLabelToAppRole(label: string): AppRole | null {
  const normalized = normalizeString(label);
  return TWENTY_ROLE_TO_APP_ROLE[normalized] ?? null;
}

export function isTaskCompleted(status?: string | null): boolean {
  const s = normalizeString(status);
  return s === CRM_TASK_STATUS.CONCLUIDO || s === CRM_TASK_STATUS.DONE;
}

export function isTaskCancelled(status?: string | null): boolean {
  const s = normalizeString(status);
  return s === CRM_TASK_STATUS.CANCELADO;
}

export function isTaskIncomplete(status?: string | null): boolean {
  return normalizeTaskStatus(status) === CRM_TASK_STATUS.INCOMPLETO;
}

/** Visitas encerradas (não aparecem na agenda ativa). */
export function isTaskTerminal(status?: string | null): boolean {
  return isTaskCompleted(status) || isTaskCancelled(status) || isTaskIncomplete(status);
}
