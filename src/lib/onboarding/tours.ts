export type { TourStepDefinition, TourChapter, TourChapterId, TourViewport } from "@/lib/onboarding/chapters/types";
export {
  ONBOARDING_CHAPTERS,
  ONBOARDING_ESSENTIALS_CHAPTER_ID,
  ONBOARDING_DEFAULT_CHAPTER_ID,
  getChaptersForTour,
  getChapterById,
  getAutostartChapterId,
  listChaptersForRole,
  getChapterSteps,
  getAllStepsForTour,
  tourHasChapterPicker,
} from "@/lib/onboarding/chapters";
export { modalStep, mapContextModalStep, TOUR_INTRO_KEYBOARD_HINT } from "@/lib/onboarding/tourStepHelpers";

import type { OnboardingTourId } from "@/lib/schemas/onboarding";
import { getAllStepsForTour } from "@/lib/onboarding/chapters";

/** @deprecated Prefer getChapterSteps / getAllStepsForTour — mantido para compatibilidade de testes. */
export const ONBOARDING_TOURS: Record<OnboardingTourId, import("@/lib/onboarding/chapters/types").TourStepDefinition[]> = {
  technician: getAllStepsForTour("technician"),
  warehouse: getAllStepsForTour("warehouse"),
  admin: getAllStepsForTour("admin"),
  ceo: getAllStepsForTour("ceo"),
};
