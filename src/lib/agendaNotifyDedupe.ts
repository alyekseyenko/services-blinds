import type { AgendaDiffEvent } from "@/lib/agendaDiff";

const LEDGER_PREFIX = "fieldops_agenda_notify_dedupe_";
const LEDGER_TTL_MS = 2 * 60 * 1000;

export function agendaEventSignature(event: AgendaDiffEvent): string {
  const opp = event.opportunityId ?? "";
  return `${event.kind}:${event.id}:${event.dueAt ?? ""}:${opp}`;
}

/** Evita toasts/sininho repetidos quando o CRM atualiza várias vezes seguidas. */
export function filterFreshAgendaEvents(scope: string, events: AgendaDiffEvent[]): AgendaDiffEvent[] {
  if (typeof window === "undefined") return events;

  const key = `${LEDGER_PREFIX}${scope}`;
  const now = Date.now();
  let ledger: { sig: string; at: number }[] = [];

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      ledger = Array.isArray(parsed) ? (parsed as { sig: string; at: number }[]) : [];
    }
  } catch {
    ledger = [];
  }

  ledger = ledger.filter((entry) => now - entry.at < LEDGER_TTL_MS);

  const fresh: AgendaDiffEvent[] = [];
  for (const event of events) {
    const sig = agendaEventSignature(event);
    if (ledger.some((entry) => entry.sig === sig)) continue;
    fresh.push(event);
    ledger.push({ sig, at: now });
  }

  try {
    localStorage.setItem(key, JSON.stringify(ledger.slice(-80)));
  } catch {
    /* ignore */
  }

  return fresh;
}
