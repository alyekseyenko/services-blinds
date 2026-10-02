import type { OnboardingTourId } from "@/lib/schemas/onboarding";
import type { TourChapterId } from "@/lib/onboarding/chapters/types";

export const ONBOARDING_RESTART_EVENT = "app:onboarding-restart";
export const ONBOARDING_STOP_EVENT = "app:onboarding-stop";
export const ONBOARDING_CHAPTER_PICKER_OPEN_EVENT = "app:onboarding-chapter-picker-open";

export type OnboardingRestartDetail = {
  chapterId?: TourChapterId;
  tourId?: OnboardingTourId;
};

export const ONBOARDING_DEMO_PIN_ACTIVE_EVENT = "app:onboarding-demo-pin-active";
export const ONBOARDING_DEMO_PIN_INACTIVE_EVENT = "app:onboarding-demo-pin-inactive";
export const ONBOARDING_OPEN_DEMO_PIN_EVENT = "app:onboarding-open-demo-pin";
export const ONBOARDING_CLOSE_MAP_POPUP_EVENT = "app:onboarding-close-map-popup";
export const ONBOARDING_ADD_SERVICE_SHEET_OPENED_EVENT = "app:onboarding-add-service-sheet-opened";
export const ONBOARDING_ADMIN_SCHEDULE_MODAL_OPENED_EVENT =
  "app:onboarding-admin-schedule-modal-opened";
export const ONBOARDING_DEMO_OPEN_FROM_MAP_EVENT = "app:onboarding-demo-open-from-map";

export function dispatchOnboardingAdminScheduleModalOpened(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_ADMIN_SCHEDULE_MODAL_OPENED_EVENT));
}

export function dispatchOnboardingAddServiceSheetOpened(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_ADD_SERVICE_SHEET_OPENED_EVENT));
}

export type OnboardingDemoPinActiveDetail = { tourId: OnboardingTourId };

export function dispatchOnboardingStop(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_STOP_EVENT));
}

export function dispatchOnboardingChapterPickerOpen(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_CHAPTER_PICKER_OPEN_EVENT));
}

export function dispatchOnboardingRestart(detail?: OnboardingRestartDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OnboardingRestartDetail>(ONBOARDING_RESTART_EVENT, { detail: detail ?? {} })
  );
}

export function dispatchOnboardingDemoPinActive(tourId: OnboardingTourId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OnboardingDemoPinActiveDetail>(ONBOARDING_DEMO_PIN_ACTIVE_EVENT, {
      detail: { tourId },
    })
  );
}

export function dispatchOnboardingDemoPinInactive(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_DEMO_PIN_INACTIVE_EVENT));
}

export function dispatchOnboardingOpenDemoPin(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_OPEN_DEMO_PIN_EVENT));
}

export function dispatchOnboardingCloseMapPopup(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_CLOSE_MAP_POPUP_EVENT));
}

export function dispatchOnboardingDemoOpenFromMap(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_DEMO_OPEN_FROM_MAP_EVENT));
}
