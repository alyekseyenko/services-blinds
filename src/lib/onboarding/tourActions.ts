export type OnboardingTourAction =
  | "openDemoVisit"
  | "drawerTabInfo"
  | "drawerTabMeasurements"
  | "drawerMarkInProgress"
  | "seedDemoMeasurements"
  | "openAddServiceSheet"
  | "closeAddServiceSheet"
  | "selectDemoConcluido"
  | "showTechViewMap"
  | "showTechViewList"
  | "showTechViewCalendar"
  | "showTechViewHistory"
  | "showAdminViewMap"
  | "showAdminViewCalendar"
  | "showAdminViewHistory"
  | "openAdminDemoOpportunity"
  | "closeAdminDemoOpportunity"
  | "setAdminMapTabScheduled"
  | "setAdminMapTabUnscheduled"
  | "openAdminDemoScheduleModal"
  | "closeAdminDemoScheduleModal"
  | "seedAdminDemoScheduleForm"
  | "closeDemoVisit"
  | "openAdminMobileMenu"
  | "closeAdminMobileMenu"
  | "openAdminDesktopMenu"
  | "closeAdminDesktopMenu"
  | "openAdminMapHqPanel"
  | "selectAdminDemoTechnician"
  | "animateAdminDemoTechnician"
  | "stopAdminDemoTechnicianAnimation"
  | "openTechMobileMenu"
  | "closeTechMobileMenu"
  | "openTechSyncQueue"
  | "closeTechSyncQueue"
  | "drawerMarkScheduled"
  | "selectDemoIncompleto"
  | "selectDemoCancelado"
  | "openAdminMapFiltersPanel"
  | "closeAdminMapFiltersPanel"
  | "openAdminMapZonesPanel"
  | "closeAdminMapZonesPanel"
  | "setAdminDemoOpportunityScheduled"
  | "setAdminDemoOpportunityInProgress"
  | "startAdminDemoRouteSelection"
  | "openAdminDemoRouteSheet"
  | "openAdminDemoMassSchedule"
  | "closeAdminDemoMassSchedule"
  | "openAdminDemoHistoryOpportunity"
  | "stopAdminDemoRouteSelection";

const TECH_VIEW_ACTIONS = new Set<OnboardingTourAction>([
  "showTechViewMap",
  "showTechViewList",
  "showTechViewCalendar",
  "showTechViewHistory",
]);

const ADMIN_VIEW_ACTIONS = new Set<OnboardingTourAction>([
  "showAdminViewMap",
  "showAdminViewCalendar",
  "showAdminViewHistory",
]);

export function isTechViewTourAction(action: OnboardingTourAction): boolean {
  return TECH_VIEW_ACTIONS.has(action);
}

export function isAdminViewTourAction(action: OnboardingTourAction): boolean {
  return ADMIN_VIEW_ACTIONS.has(action);
}

export function isDashboardViewTourAction(action: OnboardingTourAction): boolean {
  return isTechViewTourAction(action) || isAdminViewTourAction(action);
}

export const ONBOARDING_TOUR_ACTION_EVENT = "app:onboarding-tour-action";

export type OnboardingTourActionDetail = { action: OnboardingTourAction };

export function dispatchOnboardingTourAction(action: OnboardingTourAction): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OnboardingTourActionDetail>(ONBOARDING_TOUR_ACTION_EVENT, {
      detail: { action },
    })
  );
}
