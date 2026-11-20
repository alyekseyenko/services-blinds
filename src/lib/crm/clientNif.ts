/** NIF da pessoa/contacto Twenty (`nif`). */

export function normalizeClientNif(
  contact?: { nif?: string | null } | null,
  person?: { nif?: string | null } | null
): string | undefined {
  const raw = contact?.nif?.trim() || person?.nif?.trim() || "";
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return digits;
  return raw;
}