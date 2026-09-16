"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { createOpportunityNote, fetchOpportunityNotes, AppNote } from "@/lib/crm/notes";

export async function fetchOpportunityNotesAction(
  opportunityId: string
): Promise<ActionResponse<AppNote[]>> {
  try {
    if (!opportunityId) {
      return { success: false, error: "ID da Oportunidade em falta." };
    }

    const notes = await fetchOpportunityNotes(opportunityId);
    return { success: true, data: notes };
  } catch (error: any) {
    console.error("[fetchOpportunityNotesAction] Error:", error);
    return {
      success: false,
      error: error.message || "Erro ao carregar notas do CRM."
    };
  }
}

export async function createOpportunityNoteAction(
  opportunityId: string,
  personId: string | null,
  title: string,
  bodyMarkdown: string
): Promise<ActionResponse<any>> {
  try {
    if (!opportunityId) {
      return { success: false, error: "ID da Oportunidade em falta." };
    }
    if (!bodyMarkdown || !bodyMarkdown.trim()) {
      return { success: false, error: "O conteúdo da nota não pode estar vazio." };
    }

    const note = await createOpportunityNote(opportunityId, personId, title, bodyMarkdown);
    return { success: true, data: note };
  } catch (error: any) {
    console.error("[createOpportunityNoteAction] Error:", error);
    return {
      success: false,
      error: error.message || "Erro ao criar nota no CRM."
    };
  }
}
