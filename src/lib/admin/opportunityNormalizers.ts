import type { Opportunity } from "@/types/admin";
import { resolveCalendarEventEnd } from "@/lib/visits/calendarVisitSpan";

export type RawOpportunity = Omit<
  Opportunity,
  "dueDate" | "scheduledAt" | "scheduledEndAt" | "start" | "end"
> & {
  dueDate?: string | Date | null;
  scheduledAt?: string | Date | null;
  scheduledEndAt?: string | Date | null;
};

/** CRM NUMBER fields survive JSON as numbers; `.trim()` then throws. */
function crmText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function crmOptionalText(value: unknown): string | undefined {
  const text = crmText(value).trim();
  return text || undefined;
}

export function normalizeOpportunityDates(o: RawOpportunity): Opportunity {
  const scheduledAt = o.scheduledAt ? new Date(o.scheduledAt) : null;
  const scheduledEndAt = o.scheduledEndAt ? new Date(o.scheduledEndAt) : null;
  const dueDate = o.dueDate ? new Date(o.dueDate) : null;

  const raw = o as RawOpportunity & {
    title?: unknown;
    client?: unknown;
    address?: unknown;
    addressCity?: unknown;
    technician?: unknown;
    nsi?: unknown;
    serviceNumber?: unknown;
  };

  return {
    ...o,
    title: crmText(raw.title),
    client: crmText(raw.client),
    address: crmText(raw.address),
    addressCity: raw.addressCity == null ? undefined : crmText(raw.addressCity),
    technician: raw.technician == null ? undefined : crmText(raw.technician),
    nsi: crmOptionalText(raw.nsi),
    serviceNumber: crmOptionalText(raw.serviceNumber),
    dueDate,
    scheduledAt,
    scheduledEndAt,
    start: scheduledAt ?? undefined,
    end: scheduledAt ? resolveCalendarEventEnd(scheduledAt, scheduledEndAt) : undefined,
  };
}

export function normalizeOpportunityList(items: RawOpportunity[]): Opportunity[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map(normalizeOpportunityDates);
}
