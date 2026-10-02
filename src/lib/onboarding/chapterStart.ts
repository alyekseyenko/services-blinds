import { dispatchOnboardingTourAction } from "@/lib/onboarding/tourActions";
import type { OnboardingTourAction } from "@/lib/onboarding/tourActions";
import { waitForTourElement } from "@/lib/onboarding/waitForTourAnchors";

function delay(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

/** Estado inicial estável do capítulo — uma vez, antes do driver arrancar. */
export async function runChapterStartActions(
  actions?: OnboardingTourAction[]
): Promise<void> {
  if (!actions?.length) return;

  for (const action of actions) {
    dispatchOnboardingTourAction(action);
  }
  await delay(100);

  if (actions.includes("openDemoVisit")) {
    await waitForTourElement('[data-tour="tech-drawer"]', 5000);
    return;
  }

  if (
    actions.includes("showTechViewList") ||
    actions.includes("showTechViewCalendar") ||
    actions.includes("showTechViewHistory")
  ) {
    await delay(80);
  }
}
