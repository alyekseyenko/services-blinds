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

  const results: string[] = [];
  const seen = new Set<string>();

  const addPhone = (value?: string | null) => {
    const formatted = value?.trim();
    if (!formatted || seen.has(formatted)) return;
    seen.add(formatted);
    results.push(formatted);
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

  return results;
}

export function getPrimaryPhone(phones: string[]): string | null {
  return phones[0] ?? null;
}

export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/\s/g, "")}`;
}
