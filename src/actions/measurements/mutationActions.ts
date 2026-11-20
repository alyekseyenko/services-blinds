import { ActionResponse } from "@/lib/types/action-response";
import { MeasurementsPayloadSchema, MeasurementsPayload } from "@/lib/schemas";
import { assertCanMutateTask } from "@/lib/auth/taskAccess";
import { assertCanAccessOpportunity } from "@/lib/auth/opportunityAccess";
import { saveMeasurements } from "@/lib/crm/measurements";
import { getAppSession } from "@/lib/auth/session.server";
import { getLatestMeasurementsPayload } from "@/lib/measurements/repo";
import { preservePricesForTechnicianSubmit } from "@/lib/measurements/preserveTechnicianPrices";
import {
  deleteOpportunityMeasurementsAsAdmin,
  normalizeBulkOpportunityIds,
  restoreOpportunityMeasurementsAsAdmin,
  saveAdminManualMeasurementsUseCase,
  saveAdminMeasurementRevisionUseCase,
} from "@/lib/measurements/adminSheetUseCases";
import { canAccessAdminPanel } from "@/lib/auth/rbac";
import { resolveWorkspaceMemberId } from "@/lib/auth/session";
import { toUserMessage } from "@/lib/userMessages";

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


function measurementPayloadHasLines(payload: MeasurementsPayload): boolean {
  return payload.groups.some((group) => (group.measurements?.length ?? 0) > 0);
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

    const adminName = session.user.name?.trim() || "Admin";
    const memberId = resolveWorkspaceMemberId(session.user);
    const result = await saveAdminManualMeasurementsUseCase({
      opportunityId,
      payload: parsed.data,
      adminName,
      memberId,
    });
    if (!result.ok) {
      return { success: false, error: result.error };
    }
    return { success: true, data: { version: result.version, noteSaved: result.noteSaved } };
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

    const adminName = session.user.name?.trim() || "Admin";
    const memberId = resolveWorkspaceMemberId(session.user);
    const result = await saveAdminMeasurementRevisionUseCase({
      opportunityId,
      payload: parsed.data,
      adminName,
      memberId,
    });
    if (!result.ok) {
      return { success: false, error: result.error };
    }
    return { success: true, data: { version: result.version, noteSaved: result.noteSaved } };
  } catch (error: unknown) {
    return {
      success: false,
      error: toUserMessage(error, "Não foi possível gravar a nova versão."),
    };
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
    const ids = normalizeBulkOpportunityIds(opportunityIds);
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

export async function restoreAdminMeasurementSheetsBulkAction(
  opportunityIds: string[]
): Promise<ActionResponse<{ restored: number; failed: number; notesMissed: number }>> {
  try {
    const session = await getAppSession();
    if (!session?.user.role || !canAccessAdminPanel(session.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }
    const ids = normalizeBulkOpportunityIds(opportunityIds);
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

