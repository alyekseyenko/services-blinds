export const INCOMPLETE_REASONS = [
  { id: "cliente_ausente", label: "Cliente ausente" },
  { id: "sem_acesso", label: "Sem acesso ao local" },
  { id: "falta_material", label: "Falta de material" },
  { id: "reagendar", label: "Reagendar visita" },
  { id: "outro", label: "Outro (descrever abaixo)" },
] as const;

export type IncompleteReasonId = (typeof INCOMPLETE_REASONS)[number]["id"];

export function formatIncompleteReason(reasonId: string, freeText: string): string {
  const preset = INCOMPLETE_REASONS.find((r) => r.id === reasonId);
  const label = preset?.label || reasonId;
  if (reasonId === "outro" || freeText.trim()) {
    return `${label}: ${freeText.trim()}`;
  }
  return label;
}
