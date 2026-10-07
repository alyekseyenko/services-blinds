import type { Opportunity } from "@/types/admin";

function delayRank(opp: Opportunity): number {
  if (opp.delayAlert === "red") return 0;
  if (opp.delayAlert === "orange") return 1;
  return 2;
}

function scheduledTime(opp: Opportunity): number {
  if (!opp.scheduledAt) return Number.MAX_SAFE_INTEGER;
  const t = new Date(opp.scheduledAt).getTime();
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

/** Ordenação estável para a lista do mapa (pt-PT). */
export function sortMapServicesForList(
  opportunities: Opportunity[],
  mapTab: string
): Opportunity[] {
  const copy = [...opportunities];
  copy.sort((a, b) => {
    if (mapTab === "scheduled") {
      const dt = scheduledTime(a) - scheduledTime(b);
      if (dt !== 0) return dt;
    } else if (mapTab === "unscheduled") {
      const dr = delayRank(a) - delayRank(b);
      if (dr !== 0) return dr;
      const days = (b.delayDays ?? 0) - (a.delayDays ?? 0);
      if (days !== 0) return days;
    } else {
      const aSched = a.hasScheduledTask ? 1 : 0;
      const bSched = b.hasScheduledTask ? 1 : 0;
      if (aSched !== bSched) return aSched - bSched;
      if (!a.hasScheduledTask && !b.hasScheduledTask) {
        const dr = delayRank(a) - delayRank(b);
        if (dr !== 0) return dr;
      }
    }

    const city = (a.addressCity || "").localeCompare(b.addressCity || "", "pt-PT");
    if (city !== 0) return city;

    const client = (a.client || a.title || "").localeCompare(b.client || b.title || "", "pt-PT");
    if (client !== 0) return client;

    return String(a.nsi ?? "").localeCompare(String(b.nsi ?? ""), "pt-PT", {
      numeric: true,
    });
  });
  return copy;
}
