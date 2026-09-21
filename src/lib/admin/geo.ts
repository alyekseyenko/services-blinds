/** Approximate km distance between two [lat, lng] points (same formula as admin map). */
export function euclideanKm(
  a: [number, number],
  b: [number, number]
): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

export function normalizeLocationKey(str: string | null | undefined): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
