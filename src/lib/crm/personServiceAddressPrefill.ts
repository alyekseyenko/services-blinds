import type { OpportunityServiceAddressInput } from "./opportunities";

export function hasServiceAddressText(morada?: OpportunityServiceAddressInput | null): boolean {
  if (!morada) return false;
  return (
    Boolean(morada.addressStreet1?.trim()) ||
    Boolean(morada.addressCity?.trim()) ||
    Boolean(morada.addressPostcode?.trim())
  );
}

export function normalizeCrmAddressInput(
  morada?: OpportunityServiceAddressInput | null
): OpportunityServiceAddressInput | null {
  if (!morada || !hasServiceAddressText(morada)) return null;
  return {
    addressStreet1: morada.addressStreet1 ?? "",
    addressStreet2: morada.addressStreet2 ?? "",
    addressCity: morada.addressCity ?? "",
    addressState: morada.addressState ?? "",
    addressPostcode: morada.addressPostcode ?? "",
    addressCountry: morada.addressCountry ?? "Portugal",
    addressLat: morada.addressLat ?? null,
    addressLng: morada.addressLng ?? null,
  };
}

/** Client morada (Person) first; fallback to last service address on a prior opportunity. */
export function resolveServiceAddressPrefill(
  clientMorada: OpportunityServiceAddressInput | null,
  lastServiceMorada: OpportunityServiceAddressInput | null
): OpportunityServiceAddressInput | null {
  const fromClient = normalizeCrmAddressInput(clientMorada);
  if (fromClient) return fromClient;
  return normalizeCrmAddressInput(lastServiceMorada);
}
