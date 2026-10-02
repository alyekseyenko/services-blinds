import type { AgendaSnapshotItem, PipelineSnapshotItem } from "@/lib/agendaDiff";
import { AgendaSnapshotItemSchema } from "@/lib/schemas/inAppNotification";

const SNAPSHOT_PREFIX = "fieldops_agenda_snapshot_v2_";
const PIPELINE_SNAPSHOT_PREFIX = "fieldops_agenda_pipeline_snapshot_v2_";

export const LEGACY_ADMIN_SNAPSHOT_SCOPE = "admin_member";
export const LEGACY_TECH_SNAPSHOT_SCOPE = "technician";

function snapshotStorageKey(scope: string): string {
  return `${SNAPSHOT_PREFIX}${scope}`;
}

function parseSnapshotItems(raw: unknown): AgendaSnapshotItem[] {
  if (!Array.isArray(raw)) return [];
  const items: AgendaSnapshotItem[] = [];
  for (const entry of raw) {
    const parsed = AgendaSnapshotItemSchema.safeParse(entry);
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}

/** `null` = nunca houve snapshot gravado (primeiro arranque). */
export function loadAgendaSnapshot(scope: string): AgendaSnapshotItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(snapshotStorageKey(scope));
    if (raw === null) return null;
    return parseSnapshotItems(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveAgendaSnapshot(scope: string, items: AgendaSnapshotItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(snapshotStorageKey(scope), JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

function pipelineSnapshotStorageKey(scope: string): string {
  return `${PIPELINE_SNAPSHOT_PREFIX}${scope}`;
}

export function loadPipelineSnapshot(scope: string): PipelineSnapshotItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(pipelineSnapshotStorageKey(scope));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const items: PipelineSnapshotItem[] = [];
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof (entry as PipelineSnapshotItem).opportunityId === "string" &&
        typeof (entry as PipelineSnapshotItem).stage === "string" &&
        typeof (entry as PipelineSnapshotItem).label === "string"
      ) {
        items.push(entry as PipelineSnapshotItem);
      }
    }
    return items;
  } catch {
    return null;
  }
}

export function savePipelineSnapshot(scope: string, items: PipelineSnapshotItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(pipelineSnapshotStorageKey(scope), JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

/** Copia snapshot legado para o scope do utilizador (evita diffs falsos após F5). */
export function migrateLegacyAgendaSnapshotScope(canonicalScope: string): void {
  if (typeof window === "undefined" || !canonicalScope) return;

  const legacyScope =
    canonicalScope.startsWith("admin_") && canonicalScope !== LEGACY_ADMIN_SNAPSHOT_SCOPE
      ? LEGACY_ADMIN_SNAPSHOT_SCOPE
      : canonicalScope.startsWith("tech_")
        ? LEGACY_TECH_SNAPSHOT_SCOPE
        : null;

  if (!legacyScope) return;

  try {
    const canonical = loadAgendaSnapshot(canonicalScope);
    if (canonical !== null) {
      localStorage.removeItem(snapshotStorageKey(legacyScope));
      return;
    }
    const legacy = loadAgendaSnapshot(legacyScope);
    if (legacy === null) return;
    saveAgendaSnapshot(canonicalScope, legacy);
    localStorage.removeItem(snapshotStorageKey(legacyScope));
  } catch {
    /* ignore */
  }
}
