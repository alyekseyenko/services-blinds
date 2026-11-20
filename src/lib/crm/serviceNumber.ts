/** Twenty NUMBER comes back as a float. Show the integer service number. */
export function formatServiceNumber(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return String(Math.trunc(n));
}
