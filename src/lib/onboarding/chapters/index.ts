import type { OnboardingTourId } from "@/lib/schemas/onboarding";
import type { AppRole } from "@/lib/schemas/auth";
import type { TourChapter, TourChapterId, TourStepDefinition } from "@/lib/onboarding/chapters/types";
import { TECHNICIAN_CHAPTERS } from "@/lib/onboarding/chapters/technician";
import { ADMIN_CHAPTERS } from "@/lib/onboarding/chapters/admin";
import { WAREHOUSE_CHAPTERS } from "@/lib/onboarding/chapters/warehouse";
import { CEO_CHAPTERS } from "@/lib/onboarding/chapters/ceo";

export const ONBOARDING_ESSENTIALS_CHAPTER_ID: TourChapterId = "essentials";
export const ONBOARDING_DEFAULT_CHAPTER_ID: TourChapterId = "default";

const CHAPTERS_BY_TOUR: Record<OnboardingTourId, TourChapter[]> = {
  technician: TECHNICIAN_CHAPTERS,
  admin: ADMIN_CHAPTERS,
  warehouse: WAREHOUSE_CHAPTERS,
  ceo: CEO_CHAPTERS,
};

export function getChaptersForTour(tourId: OnboardingTourId): TourChapter[] {
  return CHAPTERS_BY_TOUR[tourId] ?? [];
}

export function getChapterById(
  tourId: OnboardingTourId,
  chapterId: TourChapterId
): TourChapter | undefined {
  return getChaptersForTour(tourId).find((c) => c.id === chapterId);
}

export function getAutostartChapterId(tourId: OnboardingTourId): TourChapterId {
  const chapters = getChaptersForTour(tourId);
  if (chapters.some((c) => c.id === ONBOARDING_ESSENTIALS_CHAPTER_ID)) {
    return ONBOARDING_ESSENTIALS_CHAPTER_ID;
  }
  return chapters[0]?.id ?? ONBOARDING_DEFAULT_CHAPTER_ID;
}

export function listChaptersForRole(
  tourId: OnboardingTourId,
  role: AppRole | undefined
): TourChapter[] {
  return getChaptersForTour(tourId).filter((chapter) => {
    if (!chapter.roles?.length) return true;
    if (!role) return false;
    return chapter.roles.includes(role);
  });
}

export function getChapterSteps(
  tourId: OnboardingTourId,
  chapterId: TourChapterId
): TourStepDefinition[] {
  return getChapterById(tourId, chapterId)?.steps ?? [];
}

/** Flatten all chapters — útil para testes de cobertura de âncoras. */
export function getAllStepsForTour(tourId: OnboardingTourId): TourStepDefinition[] {
  return getChaptersForTour(tourId).flatMap((c) => c.steps);
}

export function tourHasChapterPicker(tourId: OnboardingTourId): boolean {
  return getChaptersForTour(tourId).length > 1;
}

export { CHAPTERS_BY_TOUR as ONBOARDING_CHAPTERS };
