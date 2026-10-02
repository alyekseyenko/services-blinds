import {
  dispatchOnboardingChapterPickerOpen,
  dispatchOnboardingStop,
} from "@/lib/onboarding/events";
import { dispatchOnboardingTourAction } from "@/lib/onboarding/tourActions";

/** Abre o sheet de capítulos (estado global — não depender do menu onde se clicou). */
export function requestTourChapterPicker(): void {
  if (typeof window === "undefined") return;
  dispatchOnboardingStop();
  dispatchOnboardingTourAction("closeAdminDesktopMenu");
  dispatchOnboardingTourAction("closeAdminMobileMenu");
  dispatchOnboardingTourAction("closeTechMobileMenu");
  window.requestAnimationFrame(() => {
    dispatchOnboardingChapterPickerOpen();
  });
}
