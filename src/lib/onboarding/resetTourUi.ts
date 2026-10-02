import { dispatchOnboardingCloseMapPopup } from "@/lib/onboarding/events";
import { dispatchOnboardingTourAction } from "@/lib/onboarding/tourActions";
import type { OnboardingTourId } from "@/lib/schemas/onboarding";

/** Fecha overlays, menus e estado de demo antes/depois do guia. */
export function resetTourUi(tourId: OnboardingTourId | null): void {
  dispatchOnboardingTourAction("closeAdminMobileMenu");
  dispatchOnboardingTourAction("closeAdminDesktopMenu");
  dispatchOnboardingTourAction("closeTechMobileMenu");
  dispatchOnboardingTourAction("closeAddServiceSheet");
  dispatchOnboardingTourAction("closeTechSyncQueue");
  dispatchOnboardingTourAction("stopAdminDemoTechnicianAnimation");
  dispatchOnboardingTourAction("closeAdminMapFiltersPanel");
  dispatchOnboardingTourAction("closeAdminMapZonesPanel");
  dispatchOnboardingCloseMapPopup();

  if (tourId === "technician") {
    dispatchOnboardingTourAction("closeDemoVisit");
    dispatchOnboardingTourAction("showTechViewMap");
  }

  if (tourId === "admin") {
    dispatchOnboardingTourAction("closeAdminDemoOpportunity");
    dispatchOnboardingTourAction("closeAdminDemoScheduleModal");
    dispatchOnboardingTourAction("closeAdminDemoMassSchedule");
    dispatchOnboardingTourAction("stopAdminDemoRouteSelection");
    dispatchOnboardingTourAction("showAdminViewMap");
  }
}
