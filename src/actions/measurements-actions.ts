"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { MeasurementsPayloadSchema, MeasurementsPayload } from "@/lib/schemas";
import { assertCanMutateTask } from "@/lib/auth/taskAccess";
import { assertCanAccessOpportunity } from "@/lib/auth/opportunityAccess";
import {
  attachOpportunityServiceNumber,
  fetchMeasurementSheet,
  fetchMeasurementsPayloadForOpportunity,
  saveMeasurements,
} from "@/lib/crm/measurements";
import { isAdminRole } from "@/lib/auth/session";
import { isWarehouseRole } from "@/lib/auth/rbac";
import type { AppRole } from "@/lib/schemas/auth";
import { getAppSession } from "@/lib/auth/session.server";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { createOnboardingDemoMeasurementSheet } from "@/lib/demo/demoMeasurementSheet";
import { isOnboardingDemoId } from "@/lib/demo/demoIds";
import { toUserMessage } from "@/lib/userMessages";
import {
  getSheetById,
  getLatestMeasurementsPayload,
  getLatestSheetMeta,
  getSheetByOpportunityVersion,
  deleteMeasurementSheetsForOpportunity,
  restoreMeasurementSheetsForOpportunity,
  listLatestMeasurementSheetsForAdmin,
  listSheetVersions,
  patchMeasurementLinePrices,
  fetchAdminMeasurementsDashboardStats,
} from "@/lib/measurements/repo";
import { preservePricesForTechnicianSubmit } from "@/lib/measurements/preserveTechnicianPrices";
import { stripMeasurementSheetPrices } from "@/lib/measurements/publicSheet";
import { describeMeasurementEdits } from "@/lib/measurements/editDiff";
import {
  deleteProjectedTwentyProdutos,
  projectTwentyProdutosForSheet,
} from "@/lib/measurements/projectTwenty";
import { searchPipelineServicesForMeasurements } from "@/lib/measurements/adminPipelineSearch";
import { resolveOpportunityMeasurementTask } from "@/lib/crm/measurements";
import { createOpportunityNote } from "@/lib/crm/notes";
import { AdminMeasurementsDashboardStatsSchema } from "@/lib/schemas/adminDashboard";
import { canAccessAdminPanel } from "@/lib/auth/rbac";
import { resolveWorkspaceMemberId } from "@/lib/auth/session";

function canViewMeasurementSheets(role: AppRole | undefined): boolean {
  if (!role) return false;
  return isAdminRole(role) || isWarehouseRole(role);
}

export async function submitMeasurementsAction(
  taskId: string,
  oppId: string,
  rawData: unknown,
  clientRequestId?: string
): Promise<ActionResponse<void>> {
  try {
    const access = await assertCanMutateTask(taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const validationResult = MeasurementsPayloadSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.error("[Zod Validation Error]", validationResult.error.format());
      return {
        success: false,
        error: "Dados de medidas inválidos. Por favor, verifique o formulário.",
      };
    }

    let payload: MeasurementsPayload = validationResult.data;

    const session = await getAppSession();
    const role = session?.user?.role;
    if (!role || !canAccessAdminPanel(role)) {
      const existing = await getLatestMeasurementsPayload(oppId);
      payload = preservePricesForTechnicianSubmit(payload, existing);
    }

    const oppAccess = await assertCanAccessOpportunity(oppId, taskId);
    if (!oppAccess.ok) {
      return { success: false, error: oppAccess.error };
    }

    const result = await saveMeasurements(taskId, oppId, payload, clientRequestId, {
      technicianName: session?.user.name ?? undefined,
      technicianUserId: resolveWorkspaceMemberId(session?.user),
    });
    if (!result.success) {
      return {
        success: false,
        error: result.error || "Falha ao guardar medições.",
      };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("[submitMeasurementsAction] Falha crítica:", error);

    const message = toUserMessage(error, "Ocorreu um erro ao guardar as medições.");
    return {
      success: false,
      error: message,
    };
  }
}

export async function getMeasurementSheetAction(
  opportunityId: string
): Promise<ActionResponse<MeasurementSheet>> {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role) {
      return { success: false, error: "Não autenticado." };
    }
    if (!canViewMeasurementSheets(ctx.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    if (!opportunityId) {
      return { success: false, error: "ID de Oportunidade em falta." };
    }

    if (isOnboardingDemoId(opportunityId)) {
      return { success: true, data: createOnboardingDemoMeasurementSheet() };
    }

    const sheet = await fetchMeasurementSheet(opportunityId);
    if (!sheet) {
      return { success: false, error: "Sem medições registadas para esta oportunidade." };
    }

    return { success: true, data: sheet };
  } catch (error: unknown) {
    console.error("[getMeasurementSheetAction] Error:", error);
    const message = toUserMessage(error, "Não foi possível carregar a ficha de medições.");
    return { success: false, error: message };
  }
}

export async function getMeasurementSheetByIdAction(
  sheetId: string,
  version?: number
): Promise<ActionResponse<MeasurementSheet>> {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role) {
      return { success: false, error: "Não autenticado." };
    }
    if (!canViewMeasurementSheets(ctx.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    if (!sheetId) {
      return { success: false, error: "ID da ficha em falta." };
    }

    const base = await getSheetById(sheetId);
    const sheet =
      version != null && base?.opportunityId
        ? await getSheetByOpportunityVersion(base.opportunityId, version)
        : base;

    if (!sheet) {
      return { success: false, error: "Ficha de medições não encontrada." };
    }

    return { success: true, data: await attachOpportunityServiceNumber(sheet) };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível carregar a ficha de medições.");
    return { success: false, error: message };
  }
}

export async function listMeasurementSheetsAction(
  search?: string
): Promise<ActionResponse<Awaited<ReturnType<typeof listLatestMeasurementSheetsForAdmin>>>> {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role || !canAccessAdminPanel(ctx.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const data = await listLatestMeasurementSheetsForAdmin({ search, limit: 150 });
    return { success: true, data };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível carregar a lista de medições.");
    return { success: false, error: message };
  }
}

export async function listMeasurementVersionsAction(
  opportunityId: string
): Promise<
  ActionResponse<
    Array<{ sheetId: string; version: number; createdAt: string; technicianName?: string; editedByName?: string }>
  >
> {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role || !canViewMeasurementSheets(ctx.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    return { success: true, data: await listSheetVersions(opportunityId) };
  } catch (error: unknown) {
    return { success: false, error: "Não foi possível listar versões." };
  }
}

export async function getAdminMeasurementsDashboardAction(): Promise<
  ActionResponse<import("@/lib/schemas/adminDashboard").AdminMeasurementsDashboardStats>
> {
  try {
    const session = await getAppSession();
    const role = session?.user?.role;
    if (!role || !canAccessAdminPanel(role)) {
      return { success: false, error: "Sem permissão." };
    }
    const raw = await fetchAdminMeasurementsDashboardStats();
    const parsed = AdminMeasurementsDashboardStatsSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Não foi possível carregar estatísticas." };
    }
    return { success: true, data: parsed.data };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível carregar estatísticas de medições."),
    };
  }
}

export async function getMeasurementsPayloadForOpportunityAction(
  opportunityId: string,
  taskId?: string
): Promise<ActionResponse<MeasurementsPayload>> {
  try {
    if (!opportunityId) {
      return { success: false, error: "ID de Oportunidade em falta." };
    }

    const access = await assertCanAccessOpportunity(opportunityId, taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const payload = await fetchMeasurementsPayloadForOpportunity(opportunityId);
    if (!payload?.groups?.length) {
      return { success: false, error: "Sem medições registadas." };
    }

    return { success: true, data: payload };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível carregar as medições.");
    return { success: false, error: message };
  }
}

export async function updateMeasurementSheetPricesAction(
  sheetId: string,
  updates: Array<{ lineId: string; price: string }>
): Promise<ActionResponse<void>> {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role || !canAccessAdminPanel(ctx.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    if (!sheetId) {
      return { success: false, error: "ID da ficha em falta." };
    }

    const sheet = await getSheetById(sheetId);
    if (!sheet) {
      return { success: false, error: "Ficha de medições não encontrada." };
    }

    const lineIds = new Set(
      sheet.groups.flatMap((g) => g.rows.map((r) => r.lineId).filter(Boolean) as string[])
    );
    const sanitized = updates
      .filter((u) => lineIds.has(u.lineId))
      .map((u) => ({
        lineId: u.lineId,
        price: u.price?.trim() ? u.price.trim() : null,
      }));

    const result = await patchMeasurementLinePrices(sheetId, sanitized);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível guardar os preços.");
    return { success: false, error: message };
  }
}

export async function getServiceItemsByOpportunityAction(
  opportunityId: string,
  taskId?: string
): Promise<ActionResponse<unknown[]>> {
  try {
    if (!opportunityId) {
      return { success: false, error: "ID de Oportunidade em falta." };
    }

    const access = await assertCanAccessOpportunity(opportunityId, taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const payload = await fetchMeasurementsPayloadForOpportunity(opportunityId);
    if (payload?.groups?.length) {
      return { success: true, data: payload.groups };
    }

    return { success: true, data: [] };
  } catch (error: unknown) {
    console.error("[getServiceItemsByOpportunityAction] Error:", error);
    const message = toUserMessage(error, "Não foi possível carregar os itens.");
    return { success: false, error: message };
  }
}

/** Ficha de medições no telemóvel do técnico: só a oportunidade da visita, sem preços. */
export async function getTechnicianMeasurementFichaAction(
  opportunityId: string,
  taskId: string,
  version?: number
): Promise<
  ActionResponse<{
    sheet: MeasurementSheet;
    versions: Array<{
      sheetId: string;
      version: number;
      createdAt: string;
      technicianName?: string;
      editedByName?: string;
    }>;
  }>
> {
  try {
    if (!opportunityId || !taskId) {
      return { success: false, error: "Visita em falta." };
    }
    const access = await assertCanAccessOpportunity(opportunityId, taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const requested =
      version != null && Number.isFinite(version) && version > 0 ? Math.trunc(version) : undefined;
    const raw = requested
      ? await getSheetByOpportunityVersion(opportunityId, requested)
      : await fetchMeasurementSheet(opportunityId);
    if (!raw) {
      return { success: false, error: "Sem ficha de medições para este serviço." };
    }
    if (raw.opportunityId && raw.opportunityId !== opportunityId) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const sheet = stripMeasurementSheetPrices(await attachOpportunityServiceNumber(raw));
    const versions = await listSheetVersions(opportunityId);
    return { success: true, data: { sheet, versions } };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível carregar a ficha de medições."),
    };
  }
}

function measurementPayloadHasLines(payload: MeasurementsPayload): boolean {
  return payload.groups.some((group) => (group.measurements?.length ?? 0) > 0);
}

export type MeasurementPipelineServiceHit = Awaited<
  ReturnType<typeof searchPipelineServicesForMeasurements>
>[number];

export async function searchPipelineServicesForMeasurementsAction(
  query: string
): Promise<ActionResponse<MeasurementPipelineServiceHit[]>> {
  try {
    const session = await getAppSession();
    if (!session?.user.role || !canAccessAdminPanel(session.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const data = await searchPipelineServicesForMeasurements(query, 20);
    return { success: true, data };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível pesquisar serviços."),
    };
  }
}

export async function getAdminMeasurementSeedPayloadAction(
  opportunityId: string
): Promise<ActionResponse<MeasurementsPayload>> {
  try {
    const session = await getAppSession();
    if (!session?.user.role || !canAccessAdminPanel(session.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const task = await resolveOpportunityMeasurementTask(opportunityId);
    if (!task) {
      return {
        success: false,
        error:
          "Este serviço não tem nenhuma visita no CRM. Agende uma visita antes de inserir medições.",
      };
    }
    const existing = await getLatestMeasurementsPayload(opportunityId);
    if (existing?.groups?.length) {
      return { success: true, data: existing };
    }
    return { success: true, data: { groups: [] } };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível preparar o formulário."),
    };
  }
}

export async function getAdminMeasurementPayloadAction(
  opportunityId: string
): Promise<ActionResponse<MeasurementsPayload>> {
  try {
    const session = await getAppSession();
    if (!session?.user.role || !canAccessAdminPanel(session.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const payload = await getLatestMeasurementsPayload(opportunityId);
    if (!payload?.groups?.length) {
      return { success: false, error: "Sem medições para editar." };
    }
    return { success: true, data: payload };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível carregar as medições."),
    };
  }
}

export async function saveAdminManualMeasurementsAction(
  opportunityId: string,
  raw: unknown
): Promise<ActionResponse<{ version: number; noteSaved: boolean }>> {
  try {
    const session = await getAppSession();
    if (!session?.user.role || !canAccessAdminPanel(session.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const parsed = MeasurementsPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Dados de medidas inválidos." };
    }
    if (!measurementPayloadHasLines(parsed.data)) {
      return { success: false, error: "Adicione pelo menos uma linha de medição antes de guardar." };
    }

    const task = await resolveOpportunityMeasurementTask(opportunityId);
    if (!task) {
      return {
        success: false,
        error:
          "Este serviço não tem nenhuma visita no CRM. Agende uma visita antes de inserir medições.",
      };
    }

    const existing = await getLatestMeasurementsPayload(opportunityId);
    const changes = describeMeasurementEdits(existing, parsed.data);
    if (changes.length === 0) {
      return { success: false, error: "Não há alterações para gravar." };
    }

    const adminName = session.user.name?.trim() || "Admin";
    const saved = await saveMeasurements(
      task.taskId,
      opportunityId,
      parsed.data,
      crypto.randomUUID(),
      {
        technicianName: task.technicianName,
        editedByName: adminName,
      }
    );
    if (!saved.success || !saved.version) {
      return { success: false, error: saved.error || "Não foi possível gravar as medições." };
    }

    const shown = changes.slice(0, 30);
    const extra = changes.length > shown.length ? `\n… e mais ${changes.length - shown.length} alterações.` : "";
    const intro = existing?.groups?.length
      ? `${adminName} criou a versão v${saved.version} (inserção / correção manual).`
      : `${adminName} inseriu medições manualmente (versão v${saved.version}).`;
    const body = `${intro}\n\n${shown.join("\n")}${extra}`;
    let noteSaved = true;
    try {
      const memberId = resolveWorkspaceMemberId(session.user);
      await createOpportunityNote(
        opportunityId,
        null,
        existing?.groups?.length ? "Medições editadas" : "Medições inseridas manualmente",
        body,
        `admin-measure-sos-${saved.sheetId}`,
        memberId ? { name: adminName, workspaceMemberId: memberId } : undefined
      );
    } catch (noteError) {
      noteSaved = false;
      console.error("[saveAdminManualMeasurementsAction] nota CRM:", noteError);
    }

    return { success: true, data: { version: saved.version, noteSaved } };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível gravar as medições."),
    };
  }
}

export async function saveAdminMeasurementRevisionAction(
  opportunityId: string,
  raw: unknown
): Promise<ActionResponse<{ version: number; noteSaved: boolean }>> {
  try {
    const session = await getAppSession();
    if (!session?.user.role || !canAccessAdminPanel(session.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const parsed = MeasurementsPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: "Dados de medidas inválidos." };
    }
    const meta = await getLatestSheetMeta(opportunityId);
    if (!meta) {
      return { success: false, error: "Não há uma ficha para criar uma nova versão." };
    }
    const existing = await getLatestMeasurementsPayload(opportunityId);
    const nextPayload = preservePricesForTechnicianSubmit(parsed.data, existing);
    const changes = describeMeasurementEdits(existing, nextPayload);
    if (changes.length === 0) {
      return { success: false, error: "Não há alterações para gravar." };
    }

    const adminName = session.user.name?.trim() || "Admin";
    const saved = await saveMeasurements(
      meta.taskId,
      opportunityId,
      nextPayload,
      crypto.randomUUID(),
      {
        technicianName: meta.technicianName ?? undefined,
        technicianUserId: meta.technicianUserId ?? undefined,
        editedByName: adminName,
      }
    );
    if (!saved.success || !saved.version) {
      return { success: false, error: saved.error || "Não foi possível gravar a nova versão." };
    }

    const shown = changes.slice(0, 30);
    const extra = changes.length > shown.length ? `\n… e mais ${changes.length - shown.length} alterações.` : "";
    const body = `${adminName} criou a versão v${saved.version}.\n\n${shown.join("\n")}${extra}`;
    let noteSaved = true;
    try {
      const memberId = resolveWorkspaceMemberId(session.user);
      await createOpportunityNote(
        opportunityId,
        null,
        "Medições editadas",
        body,
        `admin-measure-${saved.sheetId}`,
        memberId ? { name: adminName, workspaceMemberId: memberId } : undefined
      );
    } catch (noteError) {
      noteSaved = false;
      console.error("[saveAdminMeasurementRevisionAction] nota CRM:", noteError);
    }

    return { success: true, data: { version: saved.version, noteSaved } };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível gravar a nova versão."),
    };
  }
}

async function deleteOpportunityMeasurementsAsAdmin(
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

export async function deleteAdminMeasurementSheetsAction(
  opportunityId: string
): Promise<ActionResponse<{ versions: number; noteSaved: boolean }>> {
  try {
    const session = await getAppSession();
    if (!session?.user.role || !canAccessAdminPanel(session.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    if (!opportunityId) {
      return { success: false, error: "Obra em falta." };
    }
    const adminName = session.user.name?.trim() || "Admin";
    const memberId = resolveWorkspaceMemberId(session.user);
    const removed = await deleteOpportunityMeasurementsAsAdmin(opportunityId, adminName, memberId);
    if (!removed.ok) {
      return { success: false, error: removed.error };
    }
    return { success: true, data: { versions: 1, noteSaved: removed.noteSaved } };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível apagar as medições."),
    };
  }
}

export async function deleteAdminMeasurementSheetsBulkAction(
  opportunityIds: string[]
): Promise<ActionResponse<{ deleted: number; failed: number; notesMissed: number }>> {
  try {
    const session = await getAppSession();
    if (!session?.user.role || !canAccessAdminPanel(session.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const ids = [...new Set(opportunityIds.map((id) => id.trim()).filter(Boolean))].slice(0, 150);
    if (ids.length === 0) {
      return { success: false, error: "Selecione pelo menos uma obra." };
    }
    const adminName = session.user.name?.trim() || "Admin";
    const memberId = resolveWorkspaceMemberId(session.user);
    let deleted = 0;
    let failed = 0;
    let notesMissed = 0;
    for (const opportunityId of ids) {
      const removed = await deleteOpportunityMeasurementsAsAdmin(opportunityId, adminName, memberId);
      if (!removed.ok) {
        failed += 1;
        continue;
      }
      deleted += 1;
      if (!removed.noteSaved) notesMissed += 1;
    }
    if (deleted === 0) {
      return { success: false, error: "Nenhuma medição foi apagada. O armazém pode já estar a preparar." };
    }
    return { success: true, data: { deleted, failed, notesMissed } };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível apagar as medições."),
    };
  }
}

export async function listDeletedMeasurementSheetsAction(
  search?: string
): Promise<ActionResponse<Awaited<ReturnType<typeof listLatestMeasurementSheetsForAdmin>>>> {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role || !canAccessAdminPanel(ctx.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const data = await listLatestMeasurementSheetsForAdmin({ search, limit: 150, deleted: true });
    return { success: true, data };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível carregar as medições apagadas."),
    };
  }
}

async function restoreOpportunityMeasurementsAsAdmin(
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

export async function restoreAdminMeasurementSheetsBulkAction(
  opportunityIds: string[]
): Promise<ActionResponse<{ restored: number; failed: number; notesMissed: number }>> {
  try {
    const session = await getAppSession();
    if (!session?.user.role || !canAccessAdminPanel(session.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const ids = [...new Set(opportunityIds.map((id) => id.trim()).filter(Boolean))].slice(0, 150);
    if (ids.length === 0) {
      return { success: false, error: "Selecione pelo menos uma obra." };
    }
    const adminName = session.user.name?.trim() || "Admin";
    const memberId = resolveWorkspaceMemberId(session.user);
    let restored = 0;
    let failed = 0;
    let notesMissed = 0;
    for (const opportunityId of ids) {
      const result = await restoreOpportunityMeasurementsAsAdmin(opportunityId, adminName, memberId);
      if (!result.ok) {
        failed += 1;
        continue;
      }
      restored += 1;
      if (!result.noteSaved) notesMissed += 1;
    }
    if (restored === 0) {
      return { success: false, error: "Nenhuma medição foi recuperada." };
    }
    return { success: true, data: { restored, failed, notesMissed } };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível recuperar as medições."),
    };
  }
}
