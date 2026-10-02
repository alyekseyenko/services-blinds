import type { AgendaDiffEvent, AgendaSnapshotItem } from "@/lib/agendaDiff";
import { CRM_TASK_STATUS, normalizeTaskStatus } from "@/lib/crm/contract";

export const DEFAULT_LATE_GRACE_MS = 30 * 60 * 1000;
const LEDGER_PREFIX = "fieldops_agenda_late_notify_";
const LEDGER_TTL_MS = 48 * 60 * 60 * 1000;

type LedgerEntry = { key: string; at: number };

function ledgerStorageKey(scope: string): string {
  return `${LEDGER_PREFIX}${scope}`;
}

function readLedger(scope: string): LedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ledgerStorageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LedgerEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLedger(scope: string, entries: LedgerEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ledgerStorageKey(scope), JSON.stringify(entries.slice(-200)));
  } catch {
    /* ignore */
  }
}

function pruneLedger(entries: LedgerEntry[], now: number): LedgerEntry[] {
  return entries.filter((e) => now - e.at < LEDGER_TTL_MS);
}

export function lateVisitLedgerKey(taskId: string, dueAtIso: string): string {
  return `${taskId}:${dueAtIso}`;
}

/** Pure: visits still AGENDADO past dueAt + grace. */
export function detectLateVisits(
  items: AgendaSnapshotItem[],
  now: number,
  graceMs: number = DEFAULT_LATE_GRACE_MS
): AgendaDiffEvent[] {
  const events: AgendaDiffEvent[] = [];
  for (const item of items) {
    if (normalizeTaskStatus(item.status) !== CRM_TASK_STATUS.AGENDADO) continue;
    if (!item.dueAt?.trim()) continue;
    const dueMs = new Date(item.dueAt).getTime();
    if (Number.isNaN(dueMs)) continue;
    if (dueMs + graceMs >= now) continue;

    events.push({
      kind: "atrasada",
      id: item.id,
      label: item.label,
      dueAt: item.dueAt,
      status: item.status,
      clientName: item.clientName,
      nsi: item.nsi,
      visitTitle: item.visitTitle,
      opportunityId: item.opportunityId,
      technicianName: item.technicianName,
    });
  }
  return events;
}

export function filterUnrecordedLateVisits(
  scope: string,
  events: AgendaDiffEvent[]
): AgendaDiffEvent[] {
  if (typeof window === "undefined") return events;
  const now = Date.now();
  const ledger = pruneLedger(readLedger(scope), now);
  const keys = new Set(ledger.map((e) => e.key));
  const fresh: AgendaDiffEvent[] = [];
  for (const event of events) {
    if (event.kind !== "atrasada" || !event.dueAt) {
      fresh.push(event);
      continue;
    }
    const key = lateVisitLedgerKey(event.id, event.dueAt);
    if (keys.has(key)) continue;
    fresh.push(event);
  }
  return fresh;
}

export function recordLateVisitNotifications(scope: string, events: AgendaDiffEvent[]): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const ledger = pruneLedger(readLedger(scope), now);
  for (const event of events) {
    if (event.kind !== "atrasada" || !event.dueAt) continue;
    ledger.push({ key: lateVisitLedgerKey(event.id, event.dueAt), at: now });
  }
  writeLedger(scope, ledger);
}
