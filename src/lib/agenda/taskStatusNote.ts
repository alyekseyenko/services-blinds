import { stripVisitServicesMarker } from "@/lib/crm/visitServicesMarker";

const MAX_NOTE_LEN = 120;

/** Primeira linha útil do corpo da tarefa (motivo incompleta/cancelada, etc.). */
export function extractTaskStatusNote(markdown?: string | null): string | undefined {
  const stripped = stripVisitServicesMarker(markdown ?? "").trim();
  if (!stripped) return undefined;

  const firstLine =
    stripped
      .split(/\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";

  if (!firstLine) return undefined;

  if (firstLine.toUpperCase().startsWith("CANCELAMENTO PELO CLIENTE:")) {
    const reason = firstLine.slice("CANCELAMENTO PELO CLIENTE:".length).trim();
    return reason
      ? `Cancelada pelo cliente — ${truncate(reason)}`
      : "Cancelada pelo cliente";
  }

  return truncate(firstLine);
}

function truncate(text: string): string {
  if (text.length <= MAX_NOTE_LEN) return text;
  return `${text.slice(0, MAX_NOTE_LEN - 1)}…`;
}
