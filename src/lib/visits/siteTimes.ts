export const VISIT_SITE_TIMES_REGEX = /<!--\s*\[VISIT_SITE_TIMES\]([\s\S]*?)\s*-->/;
const VISIT_SITE_TIMES_REGEX_GLOBAL = /<!--\s*\[VISIT_SITE_TIMES\][\s\S]*?\s*-->/g;

export type VisitSiteSegment = {
  arrivedAt: string;
  closedAt?: string;
};

export type VisitSiteTimes = {
  arrivedAt?: string;
  closedAt?: string;
  segments?: VisitSiteSegment[];
};

function isSegmentRow(value: unknown): value is VisitSiteSegment {
  if (!value || typeof value !== "object") return false;
  const row = value as VisitSiteSegment;
  return typeof row.arrivedAt === "string";
}

export function normalizeVisitSiteSegments(times: VisitSiteTimes): VisitSiteSegment[] {
  const fromSegments = (times.segments ?? []).filter(isSegmentRow);
  if (fromSegments.length > 0) return fromSegments;
  if (times.arrivedAt) {
    return [{ arrivedAt: times.arrivedAt, closedAt: times.closedAt }];
  }
  return [];
}

function toStoredVisitSiteTimes(segments: VisitSiteSegment[]): VisitSiteTimes {
  if (segments.length === 0) return {};
  const first = segments[0]!;
  const last = segments[segments.length - 1]!;
  return {
    arrivedAt: first.arrivedAt,
    closedAt: last.closedAt,
    segments,
  };
}

export function parseVisitSiteTimes(markdown?: string | null): VisitSiteTimes {
  if (!markdown) return {};
  const match = markdown.match(VISIT_SITE_TIMES_REGEX);
  if (!match?.[1]) return {};
  try {
    const parsed = JSON.parse(match[1].trim()) as VisitSiteTimes;
    if (!parsed || typeof parsed !== "object") return {};
    const segments = Array.isArray(parsed.segments)
      ? parsed.segments.filter(isSegmentRow)
      : undefined;
    return {
      arrivedAt: typeof parsed.arrivedAt === "string" ? parsed.arrivedAt : undefined,
      closedAt: typeof parsed.closedAt === "string" ? parsed.closedAt : undefined,
      segments: segments?.length ? segments : undefined,
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
  const segments = normalizeVisitSiteSegments(times);
  if (segments.length === 0) return base;
  const payload = toStoredVisitSiteTimes(segments);
  const marker = `<!-- [VISIT_SITE_TIMES]${JSON.stringify(payload)} -->`;
  return base ? `${base}\n\n${marker}` : marker;
}

export function recordVisitArrival(markdown: string, atIso: string): string {
  const current = parseVisitSiteTimes(markdown);
  const segments = [...normalizeVisitSiteSegments(current)];
  const last = segments[segments.length - 1];
  if (last && !last.closedAt) return markdown;
  segments.push({ arrivedAt: atIso });
  return writeVisitSiteTimesMarker(markdown, toStoredVisitSiteTimes(segments));
}

export function recordVisitDeparture(markdown: string, atIso: string): string {
  const current = parseVisitSiteTimes(markdown);
  const segments = [...normalizeVisitSiteSegments(current)];
  if (segments.length === 0) return markdown;
  const last = segments[segments.length - 1]!;
  if (last.closedAt) return markdown;
  last.closedAt = atIso;
  return writeVisitSiteTimesMarker(markdown, toStoredVisitSiteTimes(segments));
}

/** Soma apenas períodos fechados (pausa entre incompleto e novo agendamento). */
export function computeOnSiteDurationMs(times: VisitSiteTimes): number | null {
  const segments = normalizeVisitSiteSegments(times);
  if (segments.length === 0) return null;
  let total = 0;
  let anyClosed = false;
  for (const seg of segments) {
    if (!seg.closedAt) continue;
    const start = Date.parse(seg.arrivedAt);
    const end = Date.parse(seg.closedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    total += end - start;
    anyClosed = true;
  }
  return anyClosed ? total : null;
}

export function sumOnSiteDurationMsFromMarkers(
  markdowns: Array<string | null | undefined>
): number | null {
  let total = 0;
  let any = false;
  for (const markdown of markdowns) {
    const ms = computeOnSiteDurationMs(parseVisitSiteTimes(markdown));
    if (ms === null) continue;
    total += ms;
    any = true;
  }
  return any ? total : null;
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
