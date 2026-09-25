"use server";

import { headers } from "next/headers";
import { verifyPublicToken } from "@/lib/publicTokens";
import {
  PublicCancellationInputSchema,
  PublicEvaluationInputSchema,
} from "@/lib/schemas/publicPortal";
import { submitServiceFeedback, getOpportunityClientRating } from "@/lib/crm/opportunities";
import { cancelAppointmentByClient, getTaskStatusForPublicPortal } from "@/lib/crm/tasks";
import { canClientCancelTask } from "@/lib/crm/contract";
import type { ActionResponse } from "@/lib/types/action-response";

const RATE_LIMIT_MS = 5000;
const rateLimitMap = new Map<string, number>();

function getRateLimitKey(action: string, resourceId: string): string {
  return `${action}:${resourceId}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(key) ?? 0;
  if (now - last < RATE_LIMIT_MS) return true;
  rateLimitMap.set(key, now);
  return false;
}

async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  return (
    headerStore.get("x-real-ip")?.trim() ||
    headerStore.get("cf-connecting-ip")?.trim() ||
    headerStore.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "unknown"
  );
}

function sanitizeText(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

export async function submitEvaluationAction(
  input: unknown
): Promise<ActionResponse<{ submitted: true }>> {
  try {
    const parsed = PublicEvaluationInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Dados de avaliação inválidos." };
    }

    const { opportunityId, token, rating, feedback } = parsed.data;
    const rateKey = `${await getClientIp()}:${getRateLimitKey("evaluation", opportunityId)}`;
    if (isRateLimited(rateKey)) {
      return { success: false, error: "Aguarde alguns segundos antes de tentar novamente." };
    }

    const verified = verifyPublicToken(token, {
      purpose: "evaluation",
      opportunityId,
    });
    if (!verified) {
      return { success: false, error: "Link de avaliação inválido ou expirado." };
    }

    const existingRating = await getOpportunityClientRating(opportunityId);
    if (existingRating !== null) {
      return { success: false, error: "Esta avaliação já foi submetida." };
    }

    await submitServiceFeedback(opportunityId, rating, sanitizeText(feedback || ""));
    return { success: true, data: { submitted: true } };
  } catch (error) {
    console.error("[submitEvaluationAction]", error);
    return {
      success: false,
      error: "Não foi possível submeter a avaliação. Tente novamente mais tarde.",
    };
  }
}

export async function cancelAppointmentAction(
  input: unknown
): Promise<ActionResponse<{ cancelled: true }>> {
  try {
    const parsed = PublicCancellationInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Dados de cancelamento inválidos." };
    }

    const { taskId, token, reason } = parsed.data;
    const rateKey = `${await getClientIp()}:${getRateLimitKey("cancellation", taskId)}`;
    if (isRateLimited(rateKey)) {
      return { success: false, error: "Aguarde alguns segundos antes de tentar novamente." };
    }

    const verified = verifyPublicToken(token, {
      purpose: "cancellation",
      taskId,
    });
    if (!verified) {
      return { success: false, error: "Link de cancelamento inválido ou expirado." };
    }

    const status = await getTaskStatusForPublicPortal(taskId);
    if (!status) {
      return { success: false, error: "Agendamento não encontrado." };
    }
    if (!canClientCancelTask(status)) {
      return { success: false, error: "Este agendamento já não pode ser cancelado." };
    }

    await cancelAppointmentByClient(taskId, sanitizeText(reason));
    return { success: true, data: { cancelled: true } };
  } catch (error) {
    console.error("[cancelAppointmentAction]", error);
    return {
      success: false,
      error: "Não foi possível processar o cancelamento. Tente novamente mais tarde.",
    };
  }
}
