import { normalizePhoneDigits } from "@/lib/crm/phones";

/** Dígitos apenas (para pesquisa e deduplicação de telefone). */
export function normalizeAdminPhoneDigits(raw: string): string {
  return normalizePhoneDigits(raw);
}

export function parseAdminClientPhoneForTwenty(raw: string): {
  callingCode: string;
  number: string;
} {
  const digits = normalizeAdminPhoneDigits(raw);
  if (!digits) {
    return { callingCode: "+351", number: "" };
  }
  if (digits.startsWith("351") && digits.length > 9) {
    return { callingCode: "+351", number: digits.slice(3) };
  }
  return { callingCode: "+351", number: digits };
}

export function hasValidAdminClientContact(email?: string, phone?: string): boolean {
  const mail = email?.trim();
  if (mail && mail.includes("@")) return true;
  return normalizeAdminPhoneDigits(phone || "").length >= 9;
}
