"use server";

import { assertCanMutateTask } from "@/lib/auth/taskAccess";
import { uploadVisitPhotoAttachment } from "@/lib/crm/visitFiles";
import { ActionResponse } from "@/lib/types/action-response";
import { toUserMessage } from "@/lib/userMessages";
import { resolveActionErrorCode } from "@/lib/sync/syncQueuePolicy";
import { VisitPhotoUploadInputSchema } from "@/lib/visits/visitPhoto";
import { assertTaskLinkedToOpportunity } from "@/lib/visits/visitPhotoTaskAccess";

export async function uploadVisitPhotoAction(
  formData: FormData
): Promise<ActionResponse<{ attachmentId: string }>> {
  try {
    const taskId = formData.get("taskId");
    const opportunityId = formData.get("opportunityId");
    const clientRequestId = formData.get("clientRequestId");
    const filename = formData.get("filename");
    const file = formData.get("file");

    const parsed = VisitPhotoUploadInputSchema.safeParse({
      taskId,
      opportunityId,
      clientRequestId,
    });
    if (!parsed.success) {
      return { success: false, error: "Dados da foto inválidos." };
    }

    if (!(file instanceof File) || file.size <= 0) {
      return { success: false, error: "Ficheiro em falta." };
    }

    const safeFilename =
      typeof filename === "string" && filename.trim().length > 0
        ? filename.trim().slice(0, 120)
        : "foto-terreno.jpg";

    const access = await assertCanMutateTask(parsed.data.taskId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const linked = await assertTaskLinkedToOpportunity(
      parsed.data.taskId,
      parsed.data.opportunityId
    );
    if (!linked.ok) {
      return {
        success: false,
        error: linked.error,
        errorCode: "business",
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadVisitPhotoAttachment({
      opportunityId: parsed.data.opportunityId,
      filename: safeFilename,
      bytes: new Uint8Array(buffer),
      clientRequestId: parsed.data.clientRequestId,
    });

    return { success: true, data: { attachmentId: result.attachmentId } };
  } catch (error: unknown) {
    const raw = error instanceof Error ? error.message : String(error);
    const message = toUserMessage(error, "Não foi possível guardar a foto no serviço.");
    return {
      success: false,
      error: message,
      errorCode: resolveActionErrorCode(raw) ?? resolveActionErrorCode(message),
    };
  }
}