"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { MeasurementsPayloadSchema, MeasurementsPayload } from "@/lib/schemas";
import { assertCanMutateTask } from "@/lib/auth/taskAccess";
import { assertCanAccessOpportunity } from "@/lib/auth/opportunityAccess";
import {
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
  getSheetByOpportunityVersion,
  listLatestMeasurementSheetsForAdmin,
  listSheetVersions,
  patchMeasurementLinePrices,
  fetchAdminMeasurementsDashboardStats,
} from "@/lib/measurements/repo";
import { preservePricesForTechnicianSubmit } from "@/lib/measurements/preserveTechnicianPrices";
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

    return { success: true, data: sheet };
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
  ActionResponse<Array<{ sheetId: string; version: number; createdAt: string; technicianName?: string }>>
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
