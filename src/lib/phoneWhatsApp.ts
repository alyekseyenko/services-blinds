import { normalizePhoneDigits } from "@/lib/crm/phones";

/** WhatsApp deep link for a phone number (Portugal-first when digits lack country code). */
export function toWhatsAppHref(phone: string): string {
  let digits = normalizePhoneDigits(phone);
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.length === 9 && digits.startsWith("9")) {
    digits = `351${digits}`;
  }
  return `https://wa.me/${digits}`;
}