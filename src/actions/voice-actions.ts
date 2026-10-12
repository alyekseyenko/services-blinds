"use server";

import { canAccessTechnicianDashboard } from "@/lib/auth/rbac";
import { getAppSession } from "@/lib/auth/session.server";
import type { ActionResponse } from "@/lib/types/action-response";
import { toUserMessage } from "@/lib/userMessages";
import { getSpeechProvider, isSpeechProviderConfigured } from "@/lib/voice/provider";
import { consumeVoiceRateLimit } from "@/lib/voice/rateLimit";

const MAX_SUMMARIZE_CHARS = 12_000;

export async function summarizeVisitTextAction(
  text: string
): Promise<ActionResponse<{ text: string }>> {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role || !canAccessTechnicianDashboard(ctx.user.role)) {
      return { success: false, error: "Acesso não autorizado." };
    }

    if (!isSpeechProviderConfigured()) {
      return { success: false, error: "Ditada indisponível." };
    }

    const rate = consumeVoiceRateLimit(ctx.user.id ?? ctx.user.email ?? "technician");
    if (!rate.ok) {
      return { success: false, error: rate.message };
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, error: "Não há texto para resumir." };
    }
    if (trimmed.length > MAX_SUMMARIZE_CHARS) {
      return {
        success: false,
        error: "Texto demasiado longo para resumir. Reduza o conteúdo.",
      };
    }

    const summary = await getSpeechProvider().summarize(trimmed);
    return { success: true, data: { text: summary } };
  } catch (error: unknown) {
    const message = toUserMessage(error, "Não foi possível gerar o resumo.");
    return { success: false, error: message };
  }
}
