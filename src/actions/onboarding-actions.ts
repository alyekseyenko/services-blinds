"use server";

import { z } from "zod";
import { getAppSession } from "@/lib/auth/session.server";
import {
  canAccessTourId,
  getTourIdForAppRole,
} from "@/lib/onboarding/roleTour";
import {
  getOnboardingTourStatus,
  setOnboardingTourStatus,
} from "@/lib/server/onboardingStore";
import {
  OnboardingTourIdSchema,
  type OnboardingTourId,
  type OnboardingTourStatus,
} from "@/lib/schemas/onboarding";
import type { ActionResponse } from "@/lib/types/action-response";

export type OnboardingStatePayload = {
  tourId: OnboardingTourId;
  status: OnboardingTourStatus | null;
};

const OptionalTourIdSchema = z.object({
  tourId: OnboardingTourIdSchema.optional(),
});

async function resolveTourId(
  tourIdOverride: OnboardingTourId | undefined
): Promise<{ userId: string; tourId: OnboardingTourId } | { error: string }> {
  const ctx = await getAppSession();
  if (!ctx?.user.id || !ctx.user.role) {
    return { error: "Sessão inválida." };
  }
  const role = ctx.user.role;
  let tourId: OnboardingTourId | null = null;
  if (tourIdOverride && canAccessTourId(role, tourIdOverride)) {
    tourId = tourIdOverride;
  } else {
    tourId = getTourIdForAppRole(role);
  }
  if (!tourId) {
    return { error: "Perfil sem visita guiada." };
  }
  return { userId: ctx.user.id, tourId };
}

export async function getOnboardingStateAction(
  input?: { tourId?: OnboardingTourId }
): Promise<ActionResponse<OnboardingStatePayload>> {
  try {
    const parsed = OptionalTourIdSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return { success: false, error: "Parâmetros inválidos." };
    }
    const auth = await resolveTourId(parsed.data.tourId);
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    const status = getOnboardingTourStatus(auth.userId, auth.tourId);
    return {
      success: true,
      data: { tourId: auth.tourId, status },
    };
  } catch (error: unknown) {
    console.error("[getOnboardingStateAction]", error);
    return { success: false, error: "Não foi possível ler o estado da visita guiada." };
  }
}

export async function markOnboardingCompletedAction(
  input?: { tourId?: OnboardingTourId }
): Promise<ActionResponse<void>> {
  try {
    const parsed = OptionalTourIdSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return { success: false, error: "Parâmetros inválidos." };
    }
    const auth = await resolveTourId(parsed.data.tourId);
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    setOnboardingTourStatus(auth.userId, auth.tourId, "completed");
    return { success: true };
  } catch (error: unknown) {
    console.error("[markOnboardingCompletedAction]", error);
    return { success: false, error: "Não foi possível guardar a conclusão da visita." };
  }
}

export async function markOnboardingSkippedAction(
  input?: { tourId?: OnboardingTourId }
): Promise<ActionResponse<void>> {
  try {
    const parsed = OptionalTourIdSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return { success: false, error: "Parâmetros inválidos." };
    }
    const auth = await resolveTourId(parsed.data.tourId);
    if ("error" in auth) {
      return { success: false, error: auth.error };
    }
    setOnboardingTourStatus(auth.userId, auth.tourId, "skipped");
    return { success: true };
  } catch (error: unknown) {
    console.error("[markOnboardingSkippedAction]", error);
    return { success: false, error: "Não foi possível guardar o estado da visita." };
  }
}
