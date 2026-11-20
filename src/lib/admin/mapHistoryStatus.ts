export type MapHistoryOutcome = "completed" | "incomplete" | "cancelled";

function normalizeHistoryStatus(status: string | null | undefined): string {
  return (status || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

export function classifyHistoryOutcome(
  status: string | null | undefined,
  taskStatus?: string | null
): MapHistoryOutcome | null {
  const candidates = [status, taskStatus].map(normalizeHistoryStatus);
  for (const s of candidates) {
    if (s === "CONCLUIDO" || s === "DONE") return "completed";
    if (s === "INCOMPLETO") return "incomplete";
    if (s === "CANCELADO") return "cancelled";
  }
  return null;
}

export function matchesHistoryOutcomeFilter(
  opp: { status: string; taskStatus?: string | null },
  outcomes: readonly MapHistoryOutcome[]
): boolean {
  if (outcomes.length === 0) return false;
  const kind = classifyHistoryOutcome(opp.status, opp.taskStatus);
  return kind !== null && outcomes.includes(kind);
}
