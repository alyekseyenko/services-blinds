/** Data e hora visíveis em cada versão da ficha (pt-PT). */
export function formatMeasurementVersionStamp(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function measurementVersionButtonLabel(
  version: number,
  whenIso?: string | null,
  editedByName?: string | null
): string {
  const when = formatMeasurementVersionStamp(whenIso);
  const base = when ? `v${version} · ${when}` : `v${version}`;
  const editor = editedByName?.trim();
  return editor ? `${base} · Editado por ${editor}` : base;
}
