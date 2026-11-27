import { isTaskCompleted } from "@/lib/crm/contract";
import { canonicalTechnicianName } from "@/lib/technicianIdentity";
import { parseAssistantIds, parseAssistantNames } from "@/lib/visits/team";

export type CeoTaskLike = {
  status?: string | null;
  technicianName?: string | null;
  equipaAuxiliarIds?: string | null;
  equipaAuxiliarNomes?: string | null;
};

export function teamSizeFromCeoTask(task: CeoTaskLike): number {
  return 1 + parseAssistantIds(task.equipaAuxiliarIds).length;
}

export function assistantNamesFromCeoTask(task: CeoTaskLike): string[] {
  const ids = parseAssistantIds(task.equipaAuxiliarIds);
  if (ids.length === 0) return [];
  const rawNames = parseAssistantNames(task.equipaAuxiliarNomes);
  return ids.map((_, index) => {
    const label = rawNames[index]?.trim();
    return canonicalTechnicianName(label || "") || label || `Técnico ${index + 1}`;
  });
}

/** Credits concluded visits to auxiliaries for ranking (master counts stay on technicianName). */
export function creditTeamSupportVisits(
  task: CeoTaskLike,
  supportByName: Record<string, number>
): void {
  const status = String(task.status ?? "").toUpperCase();
  if (!isTaskCompleted(status)) return;
  for (const name of assistantNamesFromCeoTask(task)) {
    if (!name.trim()) continue;
    supportByName[name] = (supportByName[name] ?? 0) + 1;
  }
}

export function applyTeamSupportVisitsToRankings<T extends { name: string }>(
  rankings: T[],
  supportByName: Record<string, number>
): Array<T & { teamSupportVisits: number }> {
  return rankings.map((row) => ({
    ...row,
    teamSupportVisits: supportByName[row.name] ?? 0,
  }));
}

export function teamFieldsFromCeoServiceTask(task: CeoTaskLike | undefined): {
  teamSize: number;
  assistantTechnicians: string[];
} {
  if (!task) return { teamSize: 1, assistantTechnicians: [] };
  const teamSize = teamSizeFromCeoTask(task);
  const assistantTechnicians = assistantNamesFromCeoTask(task);
  return { teamSize, assistantTechnicians };
}