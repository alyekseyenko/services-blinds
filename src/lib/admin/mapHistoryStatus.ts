import type { Opportunity } from "@/types/admin";

export type MapHistoryOutcome = "completed" | "incomplete" | "cancelled";

export function classifyHistoryOutcome(
  status: string | null | undefined
): MapHistoryOutcome | null {
  const s = (status || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s === "CONCLUIDO") return "completed";
  if (s === "INCOMPLETO") return "incomplete";
  if (s === "CANCELADO") return "cancelled";
  return null;
}

export function matchesHistoryOutcomeFilter(
  opp: Opportunity,
  outcomes: readonly MapHistoryOutcome[]
): boolean {
  if (outcomes.length === 0) return false;
  const kind = classifyHistoryOutcome(opp.status);
  return kind !== null && outcomes.includes(kind);
}
