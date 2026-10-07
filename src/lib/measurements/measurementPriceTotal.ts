import { formatMeasurementPriceDisplay } from "@/lib/measurementSheetDisplay";

/** Valor numérico a partir de preço de linha (texto livre, vírgula ou €). */
export function parseMeasurementPriceEuro(value: string | null | undefined): number | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/€/g, "").replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Soma preços de linhas da ficha. Devolve `null` se não houver linhas ou se alguma linha não tiver preço válido.
 */
export function sumMeasurementLinePrices(prices: unknown): number | null {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  let sum = 0;
  for (const p of prices) {
    const n = parseMeasurementPriceEuro(p);
    if (n === null) return null;
    sum += n;
  }
  return sum;
}

export function formatMeasurementTotalPriceEur(total: number): string {
  const text = total.toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatMeasurementPriceDisplay(text);
}
