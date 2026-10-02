import type { AppRole } from "@/lib/schemas/auth";
import type { TourStepDefinition } from "@/lib/onboarding/chapters/types";
import { findFirstVisibleTourElement, isTourElementVisible } from "@/lib/onboarding/waitForTourAnchors";

export function isTourDesktopViewport(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 768px)").matches;
}

function stepRequiresLazyInclusion(step: TourStepDefinition): boolean {
  return Boolean(
    step.tourAction ||
      step.prepareOnHighlight ||
      step.fallbackModalIfMissing ||
      step.drawerStep ||
      step.sheetStep ||
      step.modal
  );
}

export type ShouldIncludeTourStepOptions = {
  role?: AppRole;
};

/**
 * Decide se o passo entra no guia. Passos «preguiçosos» mantêm-se mesmo sem âncora visível no arranque.
 */
export function shouldIncludeTourStep(
  step: TourStepDefinition,
  options: ShouldIncludeTourStepOptions = {}
): boolean {
  if (step.roles?.length) {
    const role = options.role;
    if (!role || !step.roles.includes(role)) return false;
  }

  if (step.viewport) {
    const isDesktop = isTourDesktopViewport();
    if (step.viewport === "mobile" && isDesktop) return false;
    if (step.viewport === "desktop" && !isDesktop) return false;
  }

  if (!step.element) return true;
  if (step.modal) return true;
  if (stepRequiresLazyInclusion(step)) return true;

  return findFirstVisibleTourElement(step.element) !== null;
}

/** @deprecated Usar shouldIncludeTourStep com options — mantido para chamadas antigas. */
export function isAdminHeaderSearchOnDesktop(step: TourStepDefinition): boolean {
  return step.element === '[data-tour="admin-search"]' && isTourDesktopViewport();
}

export { isTourElementVisible, findFirstVisibleTourElement };
