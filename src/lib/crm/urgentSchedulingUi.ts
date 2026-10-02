/** Matches CRM notes created by urgent admin scheduling (scheduleVisitCore). */
export function isUrgentSchedulingNote(note: {
  title?: string | null;
  body?: string | null;
}): boolean {
  const title = (note.title || "").trim().toLowerCase();
  const body = (note.body || "").trim().toLowerCase();
  if (title === "agendamento urgente") return true;
  return (
    body.includes("agendado diretamente") &&
    body.includes("sem confirmação do cliente")
  );
}

export function isUrgentVisitMarkdown(markdown?: string | null): boolean {
  if (!markdown) return false;
  return markdown.trim().toUpperCase().startsWith("URGENTE —");
}
