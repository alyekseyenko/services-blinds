"use server";

import { ActionResponse } from "@/lib/types/action-response";
import { assertCanAccessOpportunity } from "@/lib/auth/opportunityAccess";
import { resolveWorkspaceMemberId } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";
import { createOpportunityNote, fetchOpportunityNotes, AppNote } from "@/lib/crm/notes";
import { toUserMessage } from "@/lib/userMessages";

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
    const message = toUserMessage(error, "Erro ao carregar notas do CRM.");
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
  taskId?: string,
  clientRequestId?: string
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

    const session = await getAppSession();
    const memberId = resolveWorkspaceMemberId(session?.user);
    const authorName = session?.user?.name?.trim() || title || "Nota";
    const note = await createOpportunityNote(
      opportunityId,
      personId,
      title,
      bodyMarkdown,
      clientRequestId,
      memberId ? { name: authorName, workspaceMemberId: memberId } : undefined
    );
    return { success: true, data: note };
  } catch (error: unknown) {
    console.error("[createOpportunityNoteAction] Error:", error);
    const message = toUserMessage(error, "Erro ao criar nota no CRM.");
    return {
      success: false,
      error: message,
    };
  }
}
