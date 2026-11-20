import "server-only";

import type { MeasurementsPayload } from "@/lib/schemas";
import { saveMeasurements } from "@/lib/crm/measurements";
import { createOpportunityNote } from "@/lib/crm/notes";
import { describeMeasurementEdits } from "@/lib/measurements/editDiff";
import { preservePricesForTechnicianSubmit } from "@/lib/measurements/preserveTechnicianPrices";
import {
  deleteMeasurementSheetsForOpportunity,
  getLatestMeasurementsPayload,
  getLatestSheetMeta,
  getSheetByOpportunityVersion,
  restoreMeasurementSheetsForOpportunity,
} from "@/lib/measurements/repo";
import {
  deleteProjectedTwentyProdutos,
  projectTwentyProdutosForSheet,
} from "@/lib/measurements/projectTwenty";
import { resolveOpportunityMeasurementTask } from "@/lib/crm/measurements";

export function normalizeBulkOpportunityIds(opportunityIds: string[]): string[] {
  return [...new Set(opportunityIds.map((id) => id.trim()).filter(Boolean))].slice(0, 150);
}

export function buildAdminEditNoteBody(
  adminName: string,
  version: number,
  changes: string[],
  intro: string
): string {
  const shown = changes.slice(0, 30);
  const extra =
    changes.length > shown.length ? `\n… e mais ${changes.length - shown.length} alterações.` : "";
  return `${intro.replace("{version}", String(version))}\n\n${shown.join("\n")}${extra}`;
}

export async function saveAdminManualMeasurementsUseCase(input: {
  opportunityId: string;
  payload: MeasurementsPayload;
  adminName: string;
  memberId: string;
}): Promise<
  | { ok: true; version: number; noteSaved: boolean }
  | { ok: false; error: string }
> {
  const task = await resolveOpportunityMeasurementTask(input.opportunityId);
  if (!task) {
    return {
      ok: false,
      error:
        "Este serviço não tem nenhuma visita no CRM. Agende uma visita antes de inserir medições.",
    };
  }

  const existing = await getLatestMeasurementsPayload(input.opportunityId);
  const changes = describeMeasurementEdits(existing, input.payload);
  if (changes.length === 0) {
    return { ok: false, error: "Não há alterações para gravar." };
  }

  const saved = await saveMeasurements(
    task.taskId,
    input.opportunityId,
    input.payload,
    crypto.randomUUID(),
    {
      technicianName: task.technicianName,
      editedByName: input.adminName,
    }
  );
  if (!saved.success || !saved.version) {
    return { ok: false, error: saved.error || "Não foi possível gravar as medições." };
  }

  const intro = existing?.groups?.length
    ? `${input.adminName} criou a versão v{version} (inserção / correção manual).`
    : `${input.adminName} inseriu medições manualmente (versão v{version}).`;
  const body = buildAdminEditNoteBody(input.adminName, saved.version, changes, intro);
  let noteSaved = true;
  try {
    await createOpportunityNote(
      input.opportunityId,
      null,
      existing?.groups?.length ? "Medições editadas" : "Medições inseridas manualmente",
      body,
      `admin-measure-sos-${saved.sheetId}`,
      input.memberId ? { name: input.adminName, workspaceMemberId: input.memberId } : undefined
    );
  } catch (noteError) {
    noteSaved = false;
    console.error("[saveAdminManualMeasurementsUseCase] nota CRM:", noteError);
  }

  return { ok: true, version: saved.version, noteSaved };
}

export async function saveAdminMeasurementRevisionUseCase(input: {
  opportunityId: string;
  payload: MeasurementsPayload;
  adminName: string;
  memberId: string;
}): Promise<
  | { ok: true; version: number; noteSaved: boolean }
  | { ok: false; error: string }
> {
  const meta = await getLatestSheetMeta(input.opportunityId);
  if (!meta) {
    return { ok: false, error: "Não há uma ficha para criar uma nova versão." };
  }
  const existing = await getLatestMeasurementsPayload(input.opportunityId);
  const nextPayload = preservePricesForTechnicianSubmit(input.payload, existing);
  const changes = describeMeasurementEdits(existing, nextPayload);
  if (changes.length === 0) {
    return { ok: false, error: "Não há alterações para gravar." };
  }

  const saved = await saveMeasurements(
    meta.taskId,
    input.opportunityId,
    nextPayload,
    crypto.randomUUID(),
    {
      technicianName: meta.technicianName ?? undefined,
      technicianUserId: meta.technicianUserId ?? undefined,
      editedByName: input.adminName,
    }
  );
  if (!saved.success || !saved.version) {
    return { ok: false, error: saved.error || "Não foi possível gravar a nova versão." };
  }

  const body = buildAdminEditNoteBody(
    input.adminName,
    saved.version,
    changes,
    `${input.adminName} criou a versão v{version}.`
  );
  let noteSaved = true;
  try {
    await createOpportunityNote(
      input.opportunityId,
      null,
      "Medições editadas",
      body,
      `admin-measure-${saved.sheetId}`,
      input.memberId ? { name: input.adminName, workspaceMemberId: input.memberId } : undefined
    );
  } catch (noteError) {
    noteSaved = false;
    console.error("[saveAdminMeasurementRevisionUseCase] nota CRM:", noteError);
  }

  return { ok: true, version: saved.version, noteSaved };
}

export async function deleteOpportunityMeasurementsAsAdmin(
  opportunityId: string,
  adminName: string,
  memberId: string
): Promise<{ ok: true; noteSaved: boolean } | { ok: false; error: string }> {
  const removed = await deleteMeasurementSheetsForOpportunity(opportunityId, adminName);
  if (!removed.success) {
    return { ok: false, error: removed.error };
  }
  let produtosRemoved = true;
  try {
    await deleteProjectedTwentyProdutos(opportunityId);
  } catch (produtoError) {
    produtosRemoved = false;
    console.error("[deleteOpportunityMeasurementsAsAdmin] produtos Twenty:", produtoError);
  }
  const scope =
    removed.versions === 1
      ? `a versão v${removed.latestVersion}`
      : `${removed.versions} versões (até v${removed.latestVersion})`;
  const produtosLine = produtosRemoved
    ? "Os produtos deste serviço no Twenty foram retirados e voltam se a ficha for recuperada."
    : "A ficha foi para Apagadas, mas os produtos no Twenty não foram retirados.";
  const body = `${adminName} apagou ${scope} das medições de ${removed.clientName}. Ficam 90 dias em Apagadas e podem ser recuperadas. ${produtosLine}`;
  try {
    await createOpportunityNote(
      opportunityId,
      null,
      "Medições apagadas",
      body,
      `admin-measure-delete-${opportunityId}-${removed.latestVersion}`,
      memberId ? { name: adminName, workspaceMemberId: memberId } : undefined
    );
    return { ok: true, noteSaved: true };
  } catch (noteError) {
    console.error("[deleteOpportunityMeasurementsAsAdmin] nota CRM:", noteError);
    return { ok: true, noteSaved: false };
  }
}

export async function restoreOpportunityMeasurementsAsAdmin(
  opportunityId: string,
  adminName: string,
  memberId: string
): Promise<{ ok: true; noteSaved: boolean } | { ok: false; error: string }> {
  const restored = await restoreMeasurementSheetsForOpportunity(opportunityId);
  if (!restored.success) return { ok: false, error: restored.error };
  let produtosRestored = true;
  try {
    const sheet = await getSheetByOpportunityVersion(opportunityId, restored.latestVersion);
    if (sheet?.sheetId) await projectTwentyProdutosForSheet(sheet.sheetId);
  } catch (produtoError) {
    produtosRestored = false;
    console.error("[restoreOpportunityMeasurementsAsAdmin] produtos Twenty:", produtoError);
  }
  const body = `${adminName} recuperou as medições de ${restored.clientName} (v${restored.latestVersion}). A ficha voltou à lista Medições. ${
    produtosRestored
      ? "Os produtos no Twenty foram recriados a partir da ficha."
      : "A ficha voltou, mas os produtos no Twenty não foram recriados."
  }`;
  try {
    await createOpportunityNote(
      opportunityId,
      null,
      "Medições recuperadas",
      body,
      `admin-measure-restore-${opportunityId}-${restored.latestVersion}`,
      memberId ? { name: adminName, workspaceMemberId: memberId } : undefined
    );
    return { ok: true, noteSaved: true };
  } catch (noteError) {
    console.error("[restoreOpportunityMeasurementsAsAdmin] nota CRM:", noteError);
    return { ok: true, noteSaved: false };
  }
}