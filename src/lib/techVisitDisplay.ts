const TITLE_SEGMENT_SPLIT = /\s*[-–—]\s*/;

const VISITA_TECNICA_ONLY = /^visita\s+t[eé]cnica$/i;

function normalizeSegmentKey(segment: string): string {
  return segment.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Split CRM visit titles and drop consecutive / exact duplicate segments. */
export function parseCrmVisitTitleSegments(title: string | null | undefined): string[] {
  const raw = title?.trim() || "";
  if (!raw) return [];

  const segments: string[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(TITLE_SEGMENT_SPLIT)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = normalizeSegmentKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    segments.push(trimmed);
  }

  return segments;
}

export function formatCrmVisitTitleDetail(
  title: string | null | undefined,
  options?: { omitServiceLabels?: string[] }
): string {
  const omit = new Set(
    (options?.omitServiceLabels ?? [])
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean)
  );

  const segments = parseCrmVisitTitleSegments(title).filter((segment) => {
    if (VISITA_TECNICA_ONLY.test(segment.trim())) return false;
    const key = normalizeSegmentKey(segment);
    if (omit.has(key)) return false;
    for (const o of omit) {
      if (key === o || key.includes(o)) return false;
    }
    return true;
  });

  return segments.join(" · ");
}

/** True when a CRM title fragment is already covered by the visit address. */
export function isVisitDetailRedundantWithAddress(
  detail: string | null | undefined,
  address: string | null | undefined
): boolean {
  const d = detail?.trim() || "";
  const a = address?.trim() || "";
  if (!d || !a) return false;
  if (normalizeSegmentKey(d) === normalizeSegmentKey(a)) return true;
  const dKey = d.toLowerCase();
  const aKey = a.toLowerCase();
  return dKey.length >= 4 && aKey.includes(dKey);
}

/** Extra line under a service chip — omits CRM boilerplate titles. */
export function formatVisitServiceSupplementaryName(input: {
  rawName?: string | null;
  serviceLabel?: string | null;
  visitTitle?: string | null;
  address?: string | null;
}): string {
  const raw = input.rawName?.trim() || "";
  const label = input.serviceLabel?.trim() || "";
  if (!raw || (label && normalizeSegmentKey(raw) === normalizeSegmentKey(label))) {
    return "";
  }

  const omitLabels = [label, input.serviceLabel].filter(Boolean) as string[];
  const fromName = formatCrmVisitTitleDetail(raw, { omitServiceLabels: omitLabels });
  const fromTitle =
    raw === input.visitTitle?.trim()
      ? ""
      : formatCrmVisitTitleDetail(input.visitTitle, { omitServiceLabels: omitLabels });

  const candidate = fromName || fromTitle;
  if (!candidate) return "";
  if (isVisitDetailRedundantWithAddress(candidate, input.address)) return "";
  if (label && normalizeSegmentKey(candidate) === normalizeSegmentKey(label)) return "";
  return candidate;
}

export function buildTechVisitDrawerHeader(input: {
  client?: string | null;
  title?: string | null;
  address?: string | null;
  omitServiceLabels?: string[];
}): { heading: string; detail: string } {
  const client = input.client?.trim() || "";
  const detailFromTitle = formatCrmVisitTitleDetail(input.title, {
    omitServiceLabels: input.omitServiceLabels,
  });
  const address = input.address?.trim() || "";

  const heading =
    client && client !== "Cliente"
      ? client
      : detailFromTitle && !isVisitDetailRedundantWithAddress(detailFromTitle, address)
        ? detailFromTitle
        : address || "Visita";

  // Morada completa vive no cartão do cliente — não repetir fragmentos do título CRM no cabeçalho.
  let detail = "";
  if (!address && heading !== detailFromTitle) {
    detail = detailFromTitle;
  }

  return { heading, detail };
}
