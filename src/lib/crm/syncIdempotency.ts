const SYNC_DONE_MARKER = /<!--\s*\[SYNC_DONE\]([a-zA-Z0-9_-]+)\s*-->/g;
const MEAS_SYNC_MARKER = /<!--\s*\[MEAS_SYNC\]([a-zA-Z0-9_-]+)\s*-->/;
const NOTE_SYNC_MARKER = /<!--\s*\[NOTE_SYNC\]([a-zA-Z0-9_-]+)\s*-->/;
const HTML_SYNC_COMMENT =
  /<!--\s*\[(?:NOTE_SYNC|SYNC_DONE|MEAS_SYNC)\][\s\S]*?-->\s*/gi;

export function stripNoteBodyForDisplay(bodyMarkdown: string | null | undefined): string {
  if (!bodyMarkdown) return "";
  return bodyMarkdown.replace(HTML_SYNC_COMMENT, "").trim();
}

export function hasSyncDoneMarker(markdown: string | null | undefined, clientRequestId: string): boolean {
  if (!markdown || !clientRequestId) return false;
  const re = new RegExp(`<!--\\s*\\[SYNC_DONE\\]${escapeRegExp(clientRequestId)}\\s*-->`, "i");
  return re.test(markdown);
}

export function appendSyncDoneMarker(markdown: string, clientRequestId: string): string {
  if (hasSyncDoneMarker(markdown, clientRequestId)) return markdown;
  const base = markdown?.trimEnd() || "";
  return `${base}\n<!-- [SYNC_DONE]${clientRequestId} -->`;
}

export function hasMeasurementSyncMarker(notes: string | null | undefined, clientRequestId: string): boolean {
  if (!notes || !clientRequestId) return false;
  const re = new RegExp(`<!--\\s*\\[MEAS_SYNC\\]${escapeRegExp(clientRequestId)}\\s*-->`, "i");
  return re.test(notes);
}

export function prependMeasurementSyncMarker(notes: string, clientRequestId: string): string {
  if (hasMeasurementSyncMarker(notes, clientRequestId)) return notes;
  return `<!-- [MEAS_SYNC]${clientRequestId} -->\n${notes}`;
}

export function noteBodyWithSyncMarker(bodyMarkdown: string, clientRequestId: string): string {
  if (!clientRequestId) return bodyMarkdown;
  if (NOTE_SYNC_MARKER.test(bodyMarkdown)) return bodyMarkdown;
  return `<!-- [NOTE_SYNC]${clientRequestId} -->\n${bodyMarkdown}`;
}

export function listSyncDoneMarkers(markdown: string): string[] {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(SYNC_DONE_MARKER.source, "g");
  while ((match = re.exec(markdown)) !== null) {
    if (match[1]) ids.push(match[1]);
  }
  return ids;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
