import { z } from "zod";

export const VisitTeamRoleSchema = z.enum(["master", "assistant"]);
export type VisitTeamRole = z.infer<typeof VisitTeamRoleSchema>;

export const VisitTeamMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: VisitTeamRoleSchema,
});
export type VisitTeamMember = z.infer<typeof VisitTeamMemberSchema>;

export const VisitTeamSchema = z.object({
  masterId: z.string().min(1),
  masterName: z.string().min(1),
  assistantIds: z.array(z.string()),
  assistantNames: z.array(z.string()),
});
export type VisitTeam = z.infer<typeof VisitTeamSchema>;

const PIPE_DELIM = "|";

export function encodeAssistantIds(ids: string[]): string | null {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return null;
  return `${PIPE_DELIM}${unique.join(PIPE_DELIM)}${PIPE_DELIM}`;
}

export function parseAssistantIds(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(PIPE_DELIM)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatAssistantNames(names: string[]): string | null {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return null;
  return unique.join(", ");
}

export function parseAssistantNames(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

export function normalizeVisitTeam(input: {
  masterId: string;
  masterName: string;
  assistantIds?: string[] | null;
  assistantNames?: string[] | null;
}): VisitTeam {
  const masterId = input.masterId.trim();
  const masterName = input.masterName.trim() || "Técnico";
  const assistantIds: string[] = [];
  const assistantNames: string[] = [];
  const ids = input.assistantIds ?? [];
  const names = input.assistantNames ?? [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]?.trim();
    if (!id || id === masterId) continue;
    if (assistantIds.includes(id)) continue;
    assistantIds.push(id);
    const name = names[i]?.trim();
    assistantNames.push(name || `Técnico ${assistantIds.length}`);
  }

  for (let i = 0; i < names.length && i < assistantIds.length; i++) {
    if (assistantNames[i] && assistantNames[i] !== `Técnico ${i + 1}`) continue;
    const n = names[i]?.trim();
    if (n) assistantNames[i] = n;
  }

  return {
    masterId,
    masterName,
    assistantIds,
    assistantNames: assistantIds.map((id, idx) => assistantNames[idx] || "Técnico"),
  };
}

export function teamFromCrmFields(input: {
  assigneeId?: string | null;
  technicianName?: string | null;
  equipaAuxiliarIds?: string | null;
  equipaAuxiliarNomes?: string | null;
}): VisitTeam | null {
  const masterId = input.assigneeId?.trim();
  if (!masterId) return null;
  const masterName = input.technicianName?.trim() || "Técnico";
  return normalizeVisitTeam({
    masterId,
    masterName,
    assistantIds: parseAssistantIds(input.equipaAuxiliarIds),
    assistantNames: parseAssistantNames(input.equipaAuxiliarNomes),
  });
}

export function getAllTeamMemberIds(team: VisitTeam): string[] {
  return [team.masterId, ...team.assistantIds];
}

export function teamSize(team: VisitTeam | null | undefined): number {
  if (!team) return 1;
  return 1 + team.assistantIds.length;
}

export function isVisitMaster(team: VisitTeam, memberId: string): boolean {
  return team.masterId === memberId.trim();
}

export function isVisitAssistant(team: VisitTeam, memberId: string): boolean {
  const id = memberId.trim();
  return team.assistantIds.includes(id);
}

export function isVisitMember(team: VisitTeam, memberId: string): boolean {
  return isVisitMaster(team, memberId) || isVisitAssistant(team, memberId);
}

export function assistantPatternForMember(memberId: string): string {
  return `%|${memberId.trim()}|%`;
}

export function formatTeamSummaryPt(
  masterName: string,
  assistantCount: number,
  options?: { maxAssistantsListed?: number }
): string {
  const master = masterName.trim() || "Técnico";
  if (assistantCount <= 0) return master;
  return `${master} +${assistantCount}`;
}

export function formatTeamDetailPt(team: VisitTeam): string {
  const parts = [team.masterName.trim() || "Master"];
  for (const name of team.assistantNames) {
    if (name.trim()) parts.push(name.trim());
  }
  return parts.join(" · ");
}

export function parseTeamFromArrays(
  technicianId: string | null | undefined,
  technicianName: string | null | undefined,
  assistantIds?: string[] | null,
  assistantNames?: string[] | null
): VisitTeam | null {
  if (!technicianId?.trim()) return null;
  return normalizeVisitTeam({
    masterId: technicianId,
    masterName: technicianName?.trim() || "Técnico",
    assistantIds: assistantIds ?? [],
    assistantNames: assistantNames ?? [],
  });
}

export type AppTeamFields = {
  assistantTechnicianIds: string[];
  assistantTechnicianNames: string[];
  teamSize: number;
};

/** Maps raw CRM task fields to app-level team arrays (used by CRM mappers). */
export function resolveAppTeamFields(input: {
  assigneeId?: string | null;
  technicianName?: string | null;
  equipaAuxiliarIds?: string | null;
  equipaAuxiliarNomes?: string | null;
}): AppTeamFields {
  const team = teamFromCrmFields(input);
  if (!team) {
    return { assistantTechnicianIds: [], assistantTechnicianNames: [], teamSize: 1 };
  }
  return {
    assistantTechnicianIds: team.assistantIds,
    assistantTechnicianNames: team.assistantNames,
    teamSize: teamSize(team),
  };
}