/** User-facing label for last successful sync (pt-PT). */
export function formatSyncAgeLabel(lastSuccessAt: number | null, nowMs = Date.now()): string {
  if (!lastSuccessAt) return "A aguardar sync";
  const ageMs = Math.max(0, nowMs - lastSuccessAt);
  const ageMin = Math.floor(ageMs / 60_000);
  if (ageMin < 1) return "Agora";
  if (ageMin < 60) return `Há ${ageMin} min`;
  const ageHours = Math.floor(ageMin / 60);
  if (ageHours < 24) return `Há ${ageHours} h`;
  const d = new Date(lastSuccessAt);
  return d.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isSyncDataStale(
  lastSuccessAt: number | null,
  refreshIntervalMs: number,
  nowMs = Date.now()
): boolean {
  if (!lastSuccessAt) return false;
  const threshold = Math.max(refreshIntervalMs * 2, 120_000);
  return nowMs - lastSuccessAt > threshold;
}
