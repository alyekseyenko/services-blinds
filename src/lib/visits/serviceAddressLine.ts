type AddressParts = {
  addressStreet1?: string | null;
  addressStreet2?: string | null;
  addressCity?: string | null;
  addressPostcode?: string | null;
};

/** Street, city and postcode. Floor and door stay off the map and off GPS. */
export function formatNavigationAddressLine(
  morada?: AddressParts | null,
  fallback = ""
): string {
  if (!morada) return fallback;
  const line = [morada.addressStreet1, morada.addressCity, morada.addressPostcode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
  return line || fallback;
}

/** One-line service address, including floor / door (Endereço 2). */
export function formatServiceAddressLine(
  morada?: AddressParts | null,
  fallback = "Endereço não especificado"
): string {
  if (!morada) return fallback;
  const line = [
    morada.addressStreet1,
    morada.addressStreet2,
    morada.addressCity,
    morada.addressPostcode,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
  return line || fallback;
}
