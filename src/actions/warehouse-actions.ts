"use server";

import { isWarehouseRole } from "@/lib/auth/rbac";
import { getAppSession } from "@/lib/auth/session.server";
import { ActionResponse } from "@/lib/types/action-response";
import { toUserMessage } from "@/lib/userMessages";
import { fetchPreparationList } from "@/lib/crm/opportunities";
import {
  applyOpportunityStageTransition,
  PIPELINE_STAGE_CONFLICT_MESSAGE,
} from "@/lib/crm/pipelineTransitions";
import { CRM_STAGES } from "@/lib/crm/contract";
import { updateItemPreparationStatus } from "@/lib/crm/items";
import {
  createOpportunityNote,
  fetchOpportunityNotes,
  type AppNote,
} from "@/lib/crm/notes";
import { WarehouseItemStatusSchema } from "@/lib/warehouse/schemas";
import type { WarehouseService } from "@/lib/warehouse/types";

async function requireWarehouseRole() {
  const ctx = await getAppSession();
  if (!ctx?.user.role || !isWarehouseRole(ctx.user.role)) return null;
  return ctx;
}

export async function fetchWarehousePreparationListAction(): Promise<
  ActionResponse<WarehouseService[]>
> {
  try {
    const auth = await requireWarehouseRole();
    if (!auth) return { success: false, error: "Não autorizado." };

    const data = await fetchPreparationList();
    return { success: true, data: (data as WarehouseService[]) || [] };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível carregar a lista de preparação.");
    console.error("[fetchWarehousePreparationListAction]", error);
    return { success: false, error: message };
  }
}

export async function fetchWarehouseOpportunityNotesAction(
  opportunityId: string
): Promise<ActionResponse<AppNote[]>> {
  try {
    const auth = await requireWarehouseRole();
    if (!auth) return { success: false, error: "Não autorizado." };

    if (!opportunityId) {
      return { success: false, error: "ID da oportunidade em falta." };
    }

    const notes = await fetchOpportunityNotes(opportunityId);
    return { success: true, data: notes };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível carregar as notas.");
    console.error("[fetchWarehouseOpportunityNotesAction]", error);
    return { success: false, error: message };
  }
}

export async function createWarehouseOpportunityNoteAction(
  opportunityId: string,
  title: string,
  bodyMarkdown: string
): Promise<ActionResponse<AppNote>> {
  try {
    const auth = await requireWarehouseRole();
    if (!auth) return { success: false, error: "Não autorizado." };

    if (!opportunityId) {
      return { success: false, error: "ID da oportunidade em falta." };
    }
    if (!bodyMarkdown?.trim()) {
      return { success: false, error: "O texto da nota não pode estar vazio." };
    }

    const note = await createOpportunityNote(
      opportunityId,
      null,
      title || "Nota de armazém",
      bodyMarkdown.trim()
    );

    return { success: true, data: note as AppNote };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível criar a nota.");
    console.error("[createWarehouseOpportunityNoteAction]", error);
    return { success: false, error: message };
  }
}

export async function updateWarehouseItemStatusAction(
  itemId: string,
  warehouseStatus: string
): Promise<ActionResponse<void>> {
  try {
    const auth = await requireWarehouseRole();
    if (!auth) return { success: false, error: "Não autorizado." };

    if (!itemId || itemId.length <= 10) {
      return { success: false, error: "ID do artigo de serviço inválido." };
    }

    const parsed = WarehouseItemStatusSchema.safeParse(warehouseStatus);
    if (!parsed.success) {
      return { success: false, error: `Estado de armazém inválido: «${warehouseStatus}»` };
    }

    const status = parsed.data;
    await updateItemPreparationStatus(itemId, status === "PREPARADO", status);
    return { success: true };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível atualizar o estado do artigo.");
    console.error("[updateWarehouseItemStatusAction]", error);
    return { success: false, error: message };
  }
}

export async function completeWarehouseOrderAction(
  opportunityId: string
): Promise<ActionResponse<void>> {
  try {
    const auth = await requireWarehouseRole();
    if (!auth) return { success: false, error: "Não autorizado." };

    if (!opportunityId) {
      return { success: false, error: "ID da oportunidade em falta." };
    }

    const stageResult = await applyOpportunityStageTransition(
      opportunityId,
      CRM_STAGES.MARCAR_INSTALACAO,
      "warehouse_prep_complete"
    );
    if (stageResult.status === "conflict") {
      return { success: false, error: PIPELINE_STAGE_CONFLICT_MESSAGE };
    }
    return { success: true };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível concluir a encomenda.");
    console.error("[completeWarehouseOrderAction]", error);
    return { success: false, error: message };
  }
}
