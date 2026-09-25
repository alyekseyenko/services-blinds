import { deriveWorkflowMarkerKey } from "./contract";
import type { ExtraServiceType, VisitService, VisitServiceMode } from "@/lib/schemas";

export const VISIT_SERVICES_REGEX = /<!--\s*\[VISIT_SERVICES\]([\s\S]*?)\s*-->/;
const VISIT_SERVICES_REGEX_GLOBAL = /<!--\s*\[VISIT_SERVICES\][\s\S]*?\s*-->/g;

export interface VisitServiceMarkerRecord {
  opportunityId: string;
  clientRequestId: string;
  serviceType: ExtraServiceType;
  mode: VisitServiceMode;
  createdAt: string;
}

export function parseVisitServicesMarker(markdown?: string | null): VisitServiceMarkerRecord[] {
  if (!markdown) return [];
  const match = markdown.match(VISIT_SERVICES_REGEX);
  if (!match?.[1]) return [];
  try {
    const parsed = JSON.parse(match[1].trim());
    if (!Array.isArray(parsed)) return [];
    return parsed as VisitServiceMarkerRecord[];
  } catch {
    return [];
  }
}

export function stripVisitServicesMarker(markdown: string): string {
  return markdown.replace(VISIT_SERVICES_REGEX_GLOBAL, "").trim();
}

/** Remove injected marker blocks from free-text (e.g. technician observations). */
export function sanitizeUserMarkdown(markdown: string): string {
  return markdown.replace(VISIT_SERVICES_REGEX_GLOBAL, "").trim();
}

export function writeVisitServicesMarker(markdown: string, records: VisitServiceMarkerRecord[]): string {
  const base = stripVisitServicesMarker(markdown);
  const marker = `<!-- [VISIT_SERVICES]${JSON.stringify(records)} -->`;
  return base ? `${base}\n\n${marker}` : marker;
}

export function buildVisitServicesFromTaskNode(node: {
  bodyV2?: { markdown?: string | null } | null;
  taskTargets?: { edges?: Array<{ node?: { targetOpportunity?: any } }> };
}): VisitService[] {
  const markerRecords = parseVisitServicesMarker(node.bodyV2?.markdown);
  const markerByOpp = new Map(markerRecords.map((r) => [r.opportunityId, r]));
  const edges = node.taskTargets?.edges || [];

  const opps: Array<{ id: string; name?: string; nsi?: number | string; stage?: string }> = [];
  for (const edge of edges) {
    const opp = edge.node?.targetOpportunity;
    if (opp?.id) opps.push(opp);
  }

  if (opps.length === 0) return [];

  return opps
    .map((opp) => {
      const meta = markerByOpp.get(opp.id);
      const isPrimary = !meta;
      const serviceType =
        meta?.serviceType ||
        deriveWorkflowMarkerKey(opp.stage, opp.name || "") ||
        "GERAL";
      const mode: VisitServiceMode = meta?.mode || "now";
      return {
        opportunityId: opp.id,
        name: opp.name || "Service",
        nsi: opp.nsi != null ? String(opp.nsi) : undefined,
        stage: opp.stage,
        serviceType,
        mode,
        isPrimary,
        createdOnSite: !!meta,
        clientRequestId: meta?.clientRequestId,
      };
    })
    .sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });
}

export function resolvePrimaryOpportunityId(services: VisitService[]): string | undefined {
  return services.find((s) => s.isPrimary)?.opportunityId || services[0]?.opportunityId;
}

export function isOpportunityCreatedOnSite(
  opportunityId: string,
  taskMarkdown?: string | null
): boolean {
  return parseVisitServicesMarker(taskMarkdown).some((r) => r.opportunityId === opportunityId);
}
