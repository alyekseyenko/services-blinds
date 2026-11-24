import { z } from "zod";

const TwentyAdditionalPhoneSchema = z.object({
  number: z.string().optional().nullable(),
  callingCode: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
});

export const TwentyPhonesSchema = z.object({
  primaryPhoneNumber: z.string().optional().nullable(),
  primaryPhoneCallingCode: z.string().optional().nullable(),
  additionalPhones: z.array(TwentyAdditionalPhoneSchema).optional().nullable(),
});

export type TwentyPhones = z.infer<typeof TwentyPhonesSchema>;

/** Digits only (search and deduplication). */
export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Same PT number even if one entry has +351 and the other does not. */
export function phoneIdentityKey(raw: string): string {
  let digits = normalizePhoneDigits(raw);
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("351") && digits.length > 9) digits = digits.slice(3);
  return digits;
}

export function uniquePhoneList(phones: Array<string | null | undefined>): string[] {
  const results: string[] = [];
  const seen = new Set<string>();
  for (const raw of phones) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = phoneIdentityKey(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    results.push(trimmed);
  }
  return results;
}

export function formatPhoneEntry(
  number?: string | null,
  callingCode?: string | null
): string | null {
  const normalizedNumber = number?.trim();
  if (!normalizedNumber) return null;
  const normalizedCode = callingCode?.trim();
  return normalizedCode ? `${normalizedCode} ${normalizedNumber}`.trim() : normalizedNumber;
}

export function extractPhonesFromTwenty(
  phones?: TwentyPhones | null
): string[] {
  const parsed = TwentyPhonesSchema.safeParse(phones);
  if (!parsed.success) return [];

  const collected: string[] = [];

  const addPhone = (value?: string | null) => {
    const formatted = value?.trim();
    if (formatted) collected.push(formatted);
  };

  addPhone(
    formatPhoneEntry(
      parsed.data.primaryPhoneNumber,
      parsed.data.primaryPhoneCallingCode
    )
  );

  for (const phone of parsed.data.additionalPhones ?? []) {
    addPhone(formatPhoneEntry(phone.number, phone.callingCode));
  }

  return uniquePhoneList(collected);
}

export function getPrimaryPhone(phones: string[]): string | null {
  return phones[0] ?? null;
}

export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/\s/g, "")}`;
}
