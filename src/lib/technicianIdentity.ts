/**
 * Display names stored on tasks/sheets can lag behind Twenty workspace members.
 * Keep this map tiny — only confirmed identity changes (same person, new last name).
 */
const TECHNICIAN_NAME_ALIASES: Record<string, string> = {
  "david maneiro": "David Monteiro",
  "david manteiro": "David Monteiro",
};

export function canonicalTechnicianName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return trimmed;
  return TECHNICIAN_NAME_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export function mergeCountsByCanonicalTechnicianName(
  rows: Array<{ name: string; count: number }>
): Array<{ name: string; count: number }> {
  const merged = new Map<string, number>();
  for (const row of rows) {
    const name = canonicalTechnicianName(row.name) || "Sem técnico";
    merged.set(name, (merged.get(name) ?? 0) + row.count);
  }
  return [...merged.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-PT"));
}
