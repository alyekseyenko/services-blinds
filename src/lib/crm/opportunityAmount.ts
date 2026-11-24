/** Converte `amountMicros` do Twenty em euros (com cêntimos). */
export function opportunityEurosFromAmountMicros(rawMicros: unknown): number | undefined {
  if (rawMicros == null || rawMicros === "") return undefined;
  const micros = typeof rawMicros === "string" ? Number(rawMicros) : rawMicros;
  if (typeof micros !== "number" || !Number.isFinite(micros) || micros <= 0) return undefined;
  return Math.round(micros / 10_000) / 100;
}