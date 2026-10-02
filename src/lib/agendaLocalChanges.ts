import type { AgendaDiffEvent, AgendaDiffKind } from "@/lib/agendaDiff";
import {
  CRM_TASK_STATUS,
  isTaskCancelled,
  isTaskCompleted,
  isTaskIncomplete,
  isTaskInProgress,
  normalizeTaskStatus,
} from "@/lib/crm/contract";

const LEDGER_PREFIX = "fieldops_agenda_local_change_";
const LEDGER_TTL_MS = 10 * 60 * 1000;

type LedgerEntry = { key: string; kinds: AgendaDiffKind[]; at: number };

function ledgerKey(scope: string): string {
  return `${LEDGER_PREFIX}${scope}`;
}

function readLedger(scope: string): LedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ledgerKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LedgerEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => ({
      key: entry.key,
      kinds: Array.isArray(entry.kinds) ? entry.kinds : [],
      at: entry.at,
    }));
  } catch {
    return [];
  }
}

function writeLedger(scope: string, entries: LedgerEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ledgerKey(scope), JSON.stringify(entries.slice(-120)));
  } catch {
    /* ignore quota */
  }
}

function pruneLedger(entries: LedgerEntry[], now: number): LedgerEntry[] {
  return entries.filter((e) => now - e.at < LEDGER_TTL_MS);
}

/** Regista alteração feita neste dispositivo para não mostrar toast/sininho ao autor. */
export function markLocalAgendaChange(
  scope: string,
  key: string,
  kinds: AgendaDiffKind[]
): void {
  const trimmed = key.trim();
  if (!trimmed || kinds.length === 0) return;
  const now = Date.now();
  const ledger = pruneLedger(readLedger(scope), now);
  ledger.push({ key: trimmed, kinds: [...kinds], at: now });
  writeLedger(scope, ledger);
}

export function markLocalAgendaChanges(
  scope: string,
  keys: string[],
  kinds: AgendaDiffKind[]
): void {
  const now = Date.now();
  const ledger = pruneLedger(readLedger(scope), now);
  for (const key of keys) {
    const trimmed = key.trim();
    if (trimmed && kinds.length > 0) {
      ledger.push({ key: trimmed, kinds: [...kinds], at: now });
    }
  }
  writeLedger(scope, ledger);
}

/** Deriva o kind de diff esperado quando o técnico atualiza o estado da visita. */
export function agendaDiffKindsForQueueAction(
  action: string,
  payload: Record<string, unknown>
): AgendaDiffKind[] {
  if (action === "UPDATE_STATUS" && typeof payload.status === "string") {
    return agendaDiffKindsForTaskStatusUpdate(payload.status);
  }
  if (action === "CREATE_VISIT_SERVICE") {
    return ["nova", "servico_extra"];
  }
  return [];
}

export function agendaDiffKindsForTaskStatusUpdate(status: string): AgendaDiffKind[] {
  const s = normalizeTaskStatus(status);
  if (isTaskCompleted(s)) return ["concluida"];
  if (isTaskIncomplete(s)) return ["incompleta"];
  if (isTaskCancelled(s)) return ["cancelada"];
  if (isTaskInProgress(s)) return ["em_curso"];
  if (s === CRM_TASK_STATUS.AGENDADO) return ["reagendada", "nova"];
  return ["reagendada", "nova", "removida", "cancelada"];
}

function isLocallyChanged(scope: string, event: AgendaDiffEvent, now: number): boolean {
  const ledger = pruneLedger(readLedger(scope), now);
  for (const entry of ledger) {
    if (!entry.kinds.includes(event.kind)) continue;
    if (entry.key === event.id) return true;
    if (event.opportunityId && entry.key === event.opportunityId) return true;
  }
  return false;
}

export function filterOutLocalChanges(scope: string, events: AgendaDiffEvent[]): AgendaDiffEvent[] {
  if (typeof window === "undefined") return events;
  const now = Date.now();
  return events.filter((event) => !isLocallyChanged(scope, event, now));
}
