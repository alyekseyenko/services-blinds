import { canonicalTechnicianName } from "@/lib/technicianIdentity";

const SKIP_NAME = /não atribuído|nao atribuido|unscheduled|unassigned/i;

export function isUnassignedTechnicianName(value: string | null | undefined): boolean {
  const name = value?.trim() ?? "";
  return !name || SKIP_NAME.test(name);
}

function cleanName(value: string | null | undefined): string | null {
  const canonical = canonicalTechnicianName(value);
  if (isUnassignedTechnicianName(canonical)) return null;
  return canonical || null;
}

/** Unique technician names shown in the map legend, same set as pin dots. */
export function collectLegendTechnicianNames(input: {
  taskTechnicians?: Array<string | null | undefined>;
  liveTechnicianNames?: Array<string | null | undefined>;
}): string[] {
  const names = new Set<string>();
  for (const value of input.taskTechnicians ?? []) {
    const name = cleanName(value);
    if (name) names.add(name);
  }
  for (const value of input.liveTechnicianNames ?? []) {
    const name = cleanName(value);
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "pt-PT"));
}
