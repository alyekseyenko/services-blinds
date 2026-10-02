import { stripNoteBodyForDisplay } from "@/lib/crm/syncIdempotency";
import { formatTaskStatusPt } from "@/lib/taskStatusLabels";

const LEGACY_LEFT_SITE_TITLE = /^technician left site$/i;
const LEGACY_LEFT_SITE_BODY =
  /^(.+?)\s+left the client site\.\s*Visit closed as:\s*(.+?)\.\s*$/i;

/** Título de nota CRM para mostrar ao utilizador (pt-PT, incl. notas antigas em inglês). */
export function formatNoteTitleForDisplay(title: string | null | undefined): string {
  const raw = title?.trim() ?? "";
  if (!raw) return "Nota";
  if (LEGACY_LEFT_SITE_TITLE.test(raw)) {
    return "Saída do local do cliente";
  }
  return raw;
}

/** Texto de nota CRM para mostrar ao utilizador (sem marcadores de sync; pt-PT). */
export function formatNoteBodyForDisplay(body: string | null | undefined): string {
  let text = stripNoteBodyForDisplay(body);
  if (!text) return "";

  const legacy = text.match(LEGACY_LEFT_SITE_BODY);
  if (legacy) {
    const tech = legacy[1].trim();
    const statusRaw = legacy[2].trim();
    const estado = formatTaskStatusPt(statusRaw);
    return `${tech} saiu do local do cliente. Visita encerrada como: ${estado}.`;
  }

  return text;
}
