import type { Opportunity } from "@/types/admin";

type RawOpportunity = Omit<Opportunity, "dueDate" | "scheduledAt" | "start" | "end"> & {
  dueDate?: string | Date | null;
  scheduledAt?: string | Date | null;
};

export function normalizeOpportunityDates(o: RawOpportunity): Opportunity {
  const scheduledAt = o.scheduledAt ? new Date(o.scheduledAt) : null;
  const dueDate = o.dueDate ? new Date(o.dueDate) : null;

  return {
    ...o,
    dueDate,
    scheduledAt,
    start: scheduledAt ?? undefined,
    end: scheduledAt
      ? new Date(scheduledAt.getTime() + 60 * 60 * 1000)
      : undefined,
  };
}

export function normalizeOpportunityList(items: RawOpportunity[]): Opportunity[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map(normalizeOpportunityDates);
}
