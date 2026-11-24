import type { AdminClientSearchHit } from "@/lib/schemas/adminCommercialService";

/** Linha secundária para distinguir homónimos na pesquisa de clientes. */
export function formatAdminClientSearchSubtitle(hit: AdminClientSearchHit): string {
  const parts: string[] = [];
  if (hit.phone?.trim()) parts.push(hit.phone.trim());
  if (hit.email?.trim()) parts.push(hit.email.trim());
  if (hit.nif?.trim()) parts.push(`NIF ${hit.nif.trim()}`);
  const cityLine = [hit.addressPostcode?.trim(), hit.addressCity?.trim()].filter(Boolean).join(" ");
  if (cityLine) parts.push(cityLine);
  if (hit.addressStreet1?.trim()) {
    const street = hit.addressStreet1.trim();
    parts.push(street.length > 42 ? `${street.slice(0, 39)}…` : street);
  }
  return parts.join(" · ");
}