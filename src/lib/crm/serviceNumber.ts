/** Twenty NUMBER comes back as a float. Show the integer service number. */
export function formatServiceNumber(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return String(Math.trunc(n));
}

/** Twenty NSI is a NUMBER; stored sheets may also have "N/A". */
export function formatNsi(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const s = String(value).trim();
  if (!s || s.toUpperCase() === "N/A") return undefined;
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n <= 0) return undefined;
    return String(Math.trunc(n));
  }
  return s;
}
