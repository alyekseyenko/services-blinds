export const VISIT_SITE_TIMES_REGEX = /<!--\s*\[VISIT_SITE_TIMES\]([\s\S]*?)\s*-->/;
const VISIT_SITE_TIMES_REGEX_GLOBAL = /<!--\s*\[VISIT_SITE_TIMES\][\s\S]*?\s*-->/g;

export type VisitSiteTimes = {
  arrivedAt?: string;
  closedAt?: string;
};

export function parseVisitSiteTimes(markdown?: string | null): VisitSiteTimes {
  if (!markdown) return {};
  const match = markdown.match(VISIT_SITE_TIMES_REGEX);
  if (!match?.[1]) return {};
  try {
    const parsed = JSON.parse(match[1].trim()) as VisitSiteTimes;
    if (!parsed || typeof parsed !== "object") return {};
    return {
      arrivedAt: typeof parsed.arrivedAt === "string" ? parsed.arrivedAt : undefined,
      closedAt: typeof parsed.closedAt === "string" ? parsed.closedAt : undefined,
    };
  } catch {
    return {};
  }
}

export function stripVisitSiteTimesMarker(markdown: string): string {
  return markdown.replace(VISIT_SITE_TIMES_REGEX_GLOBAL, "").trim();
}

export function writeVisitSiteTimesMarker(markdown: string, times: VisitSiteTimes): string {
  const base = stripVisitSiteTimesMarker(markdown);
  const payload: VisitSiteTimes = {};
  if (times.arrivedAt) payload.arrivedAt = times.arrivedAt;
  if (times.closedAt) payload.closedAt = times.closedAt;
  if (!payload.arrivedAt && !payload.closedAt) {
    return base;
  }
  const marker = `<!-- [VISIT_SITE_TIMES]${JSON.stringify(payload)} -->`;
  return base ? `${base}\n\n${marker}` : marker;
}

export function recordVisitArrival(markdown: string, atIso: string): string {
  const current = parseVisitSiteTimes(markdown);
  if (current.arrivedAt) return markdown;
  return writeVisitSiteTimesMarker(markdown, { ...current, arrivedAt: atIso });
}

export function recordVisitDeparture(markdown: string, atIso: string): string {
  const current = parseVisitSiteTimes(markdown);
  if (!current.arrivedAt) return markdown;
  if (current.closedAt) return markdown;
  return writeVisitSiteTimesMarker(markdown, { ...current, closedAt: atIso });
}

export function computeOnSiteDurationMs(times: VisitSiteTimes): number | null {
  if (!times.arrivedAt || !times.closedAt) return null;
  const start = Date.parse(times.arrivedAt);
  const end = Date.parse(times.closedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
}

/** Duração legível em pt-PT (ex.: «1 h 25 min»). */
export function formatOnSiteDurationPt(durationMs: number): string {
  const totalMinutes = Math.max(1, Math.round(durationMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}
