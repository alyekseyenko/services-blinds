"use server";

import { getAppSession } from "@/lib/auth/session.server";
import { ActionResponse } from "@/lib/types/action-response";
import { fetchPreparationList, updateOpportunityStage } from "@/lib/crm/opportunities";
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
  if (!ctx || ctx.user.role !== "warehouse") return null;
  return ctx;
}

export async function fetchWarehousePreparationListAction(): Promise<
  ActionResponse<WarehouseService[]>
> {
  try {
    const auth = await requireWarehouseRole();
    if (!auth) return { success: false, error: "Unauthorized" };

    const data = await fetchPreparationList();
    return { success: true, data: (data as WarehouseService[]) || [] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load preparation list.";
    console.error("[fetchWarehousePreparationListAction]", error);
    return { success: false, error: message };
  }
}

export async function fetchWarehouseOpportunityNotesAction(
  opportunityId: string
): Promise<ActionResponse<AppNote[]>> {
  try {
    const auth = await requireWarehouseRole();
    if (!auth) return { success: false, error: "Unauthorized" };

    if (!opportunityId) {
      return { success: false, error: "Missing opportunity ID." };
    }

    const notes = await fetchOpportunityNotes(opportunityId);
    return { success: true, data: notes };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load notes.";
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
    if (!auth) return { success: false, error: "Unauthorized" };

    if (!opportunityId) {
      return { success: false, error: "Missing opportunity ID." };
    }
    if (!bodyMarkdown?.trim()) {
      return { success: false, error: "Note body cannot be empty." };
    }

    const note = await createOpportunityNote(
      opportunityId,
      null,
      title || "Warehouse Note",
      bodyMarkdown.trim()
    );

    return { success: true, data: note as AppNote };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create note.";
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
    if (!auth) return { success: false, error: "Unauthorized" };

    if (!itemId || itemId.length <= 10) {
      return { success: false, error: "Invalid service item ID." };
    }

    const parsed = WarehouseItemStatusSchema.safeParse(warehouseStatus);
    if (!parsed.success) {
      return { success: false, error: `Invalid warehouse status: "${warehouseStatus}"` };
    }

    const status = parsed.data;
    await updateItemPreparationStatus(itemId, status === "PREPARADO", status);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update item status.";
    console.error("[updateWarehouseItemStatusAction]", error);
    return { success: false, error: message };
  }
}

export async function completeWarehouseOrderAction(
  opportunityId: string
): Promise<ActionResponse<void>> {
  try {
    const auth = await requireWarehouseRole();
    if (!auth) return { success: false, error: "Unauthorized" };

    if (!opportunityId) {
      return { success: false, error: "Missing opportunity ID." };
    }

    await updateOpportunityStage(opportunityId, "MARCAR_INSTALACAO");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to complete order.";
    console.error("[completeWarehouseOrderAction]", error);
    return { success: false, error: message };
  }
}
