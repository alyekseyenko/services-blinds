"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { assertCanAccessOpportunity } from "@/lib/auth/opportunityAccess";
import { createOpportunityNote, fetchOpportunityNotes, AppNote } from "@/lib/crm/notes";

export async function fetchOpportunityNotesAction(
  opportunityId: string,
  taskId?: string
): Promise<ActionResponse<AppNote[]>> {
  try {
    if (!opportunityId) {
      return { success: false, error: "ID da Oportunidade em falta." };
    }

    const access = await assertCanAccessOpportunity(opportunityId, taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const notes = await fetchOpportunityNotes(opportunityId);
    return { success: true, data: notes };
  } catch (error: unknown) {
    console.error("[fetchOpportunityNotesAction] Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao carregar notas do CRM.";
    return {
      success: false,
      error: message,
    };
  }
}

export async function createOpportunityNoteAction(
  opportunityId: string,
  personId: string | null,
  title: string,
  bodyMarkdown: string,
  taskId?: string
): Promise<ActionResponse<unknown>> {
  try {
    if (!opportunityId) {
      return { success: false, error: "ID da Oportunidade em falta." };
    }
    if (!bodyMarkdown || !bodyMarkdown.trim()) {
      return { success: false, error: "O conteúdo da nota não pode estar vazio." };
    }

    const access = await assertCanAccessOpportunity(opportunityId, taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const note = await createOpportunityNote(opportunityId, personId, title, bodyMarkdown);
    return { success: true, data: note };
  } catch (error: unknown) {
    console.error("[createOpportunityNoteAction] Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao criar nota no CRM.";
    return {
      success: false,
      error: message,
    };
  }
}
