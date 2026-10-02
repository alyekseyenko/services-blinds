import { TOUR_MODAL_SELECTOR } from "@/lib/onboarding/tourDom";
import type { OnboardingTourAction } from "@/lib/onboarding/tourActions";
import type { TourStepDefinition } from "@/lib/onboarding/chapters/types";

export const TOUR_INTRO_KEYBOARD_HINT =
  "Pode navegar com as setas ← e → do teclado ou com os botões Seguinte e Anterior.";

export function modalStep(title: string, description: string): TourStepDefinition {
  return {
    element: TOUR_MODAL_SELECTOR,
    modal: true,
    title,
    description: `${description.trim()} ${TOUR_INTRO_KEYBOARD_HINT}`,
    align: "center",
    side: "bottom",
  };
}

/** Destaca o canvas do mapa admin (anel verde). */
export function mapContextModalStep(
  title: string,
  description: string,
  prepareOnHighlight: OnboardingTourAction | OnboardingTourAction[]
): TourStepDefinition {
  return {
    element: '[data-tour="admin-map-canvas"]',
    title,
    description,
    align: "center",
    side: "bottom",
    fallbackModalIfMissing: true,
    prepareOnHighlight,
  };
}

/** Mapa do técnico — canvas completo + pin de formação. */
export function techMapSurfaceStep(
  title: string,
  description: string,
  prepareOnHighlight: OnboardingTourAction | OnboardingTourAction[],
  options?: { focusDemoPin?: boolean }
): TourStepDefinition {
  return {
    element: '[data-tour="tech-map-canvas"]',
    title,
    description,
    align: "center",
    side: "bottom",
    fallbackModalIfMissing: true,
    focusDemoPin: options?.focusDemoPin,
    prepareOnHighlight,
  };
}
