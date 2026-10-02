import { dispatchOnboardingOpenDemoPin } from "@/lib/onboarding/events";
import { dispatchOnboardingTourAction } from "@/lib/onboarding/tourActions";
import type { TourStepDefinition } from "@/lib/onboarding/chapters/types";
import {
  findBestVisibleTourElement,
  scrollTourTargetIntoView,
  waitForTourElement,
} from "@/lib/onboarding/waitForTourAnchors";
import type { Driver } from "driver.js";

function delay(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

function runPrepareOnHighlight(def?: TourStepDefinition): void {
  const raw = def?.prepareOnHighlight;
  if (!raw) return;
  const actions = Array.isArray(raw) ? raw : [raw];
  for (const action of actions) {
    dispatchOnboardingTourAction(action);
  }
}

function isAdminScheduleElement(def?: TourStepDefinition): boolean {
  return Boolean(def?.element?.includes("admin-schedule"));
}

function isTechDrawerElement(def?: TourStepDefinition): boolean {
  return Boolean(def?.element?.includes("tech-drawer"));
}

function isTechAddServiceElement(def?: TourStepDefinition): boolean {
  return Boolean(def?.element?.includes("tech-add-service"));
}

function isTechDemoPopupStep(def?: TourStepDefinition): boolean {
  return Boolean(
    def?.element?.includes("onboarding-demo-pin") ||
      def?.element?.includes("tech-demo-open-visit")
  );
}

function isTechMeasurementsElement(def?: TourStepDefinition): boolean {
  if (!def?.element) return false;
  return (
    def.element.includes("tech-measurements") ||
    def.element.includes("tech-drawer-measurements") ||
    def.element.includes("tech-drawer-tab-measurements")
  );
}

const HEAVY_PREPARE_ACTIONS = new Set([
  "openDemoVisit",
  "seedDemoMeasurements",
  "openAddServiceSheet",
  "openTechSyncQueue",
  "showTechViewMap",
  "showTechViewList",
  "showTechViewCalendar",
  "showTechViewHistory",
]);

export function isHeavyTourPrepare(def?: TourStepDefinition): boolean {
  if (!def) return false;
  if (def.tourAction || def.focusDemoPin || def.sheetStep) return true;
  const prep = def.prepareOnHighlight;
  if (!prep) return def.drawerStep ? false : true;
  const actions = Array.isArray(prep) ? prep : [prep];
  return actions.some((action) => HEAVY_PREPARE_ACTIONS.has(action));
}

export function getStepWaitMs(def: TourStepDefinition): number | undefined {
  if (!def.element || def.modal) return undefined;
  if (def.drawerStep || def.sheetStep) return 5000;
  if (def.fallbackModalIfMissing) return 600;
  return 3500;
}

function isTourFallbackHighlightElement(el: Element | undefined): boolean {
  if (!el || !(el instanceof HTMLElement)) return true;
  const tour = el.dataset.tour;
  return tour === "app-tour-modal" || tour === "app-tour-fallback-anchor";
}

/** Se o driver ficou no modal de recurso mas o alvo real já existe, volta a destacar o passo. */
export function reconcileTourHighlightAfterPrepare(
  tourDriver: Driver,
  def: TourStepDefinition
): void {
  const idx = tourDriver.getActiveIndex();
  if (idx === undefined || !def.element || def.modal) return;
  const active = tourDriver.getActiveElement();
  if (!isTourFallbackHighlightElement(active)) return;
  const real = findBestVisibleTourElement(def.element);
  if (!real || isTourFallbackHighlightElement(real)) return;
  tourDriver.moveTo(idx);
}

async function waitForTechDemoPinPopup(timeoutMs = 4500): Promise<void> {
  const pin = await waitForTourElement('[data-tour="onboarding-demo-pin"]', timeoutMs);
  if (pin) return;
  await waitForTourElement('[data-tour="tech-demo-open-visit"]', Math.min(timeoutMs, 2500));
}

async function scrollTourTargetIfPresent(
  def: TourStepDefinition,
  timeoutMs: number
): Promise<void> {
  if (!def.element) return;
  const el = await waitForTourElement(def.element, timeoutMs);
  if (el instanceof HTMLElement) {
    scrollTourTargetIntoView(el);
  }
}

/** Só acções leves (tab, scroll no drawer) — sem reabrir visita nem seed de medições. */
export async function ensureTourStepReadyLight(def?: TourStepDefinition): Promise<void> {
  if (!def || def.modal) return;
  runPrepareOnHighlight(def);
  await delay(50);
  const timeout = def.drawerStep ? 1800 : 700;
  await scrollTourTargetIfPresent(def, timeout);
}

/** Abre vista/drawer/menus e espera a âncora antes do driver.js calcular o highlight. */
export async function ensureTourStepReady(def?: TourStepDefinition): Promise<void> {
  if (!def) return;

  if (def.tourAction) {
    dispatchOnboardingTourAction(def.tourAction);
  }
  runPrepareOnHighlight(def);

  if (def.modal) return;

  const hasPrepare = Boolean(def.prepareOnHighlight || def.tourAction || def.focusDemoPin);
  await delay(hasPrepare ? 120 : 40);

  if (def.element) {
    if (def.fallbackModalIfMissing) {
      await waitForTourElement(def.element, 450);
    } else {
      const timeout = def.drawerStep || def.sheetStep ? 4500 : 2800;
      await waitForTourElement(def.element, timeout);
    }
  }

  if (def.focusDemoPin) {
    await delay(120);
    dispatchOnboardingOpenDemoPin();
    await delay(180);
    await waitForTechDemoPinPopup(4000);
  }

  await scrollTourTargetIfPresent(def, def.drawerStep ? 1200 : 600);
}

/**
 * Prepara o passo seguinte com atalhos quando o modal/vista já está aberto
 * (evita esperas de 6–10s entre campos do agendamento ou sub-passos do calendário).
 */
export async function ensureTourStepTransition(
  previous: TourStepDefinition | undefined,
  next: TourStepDefinition | undefined
): Promise<void> {
  if (!next) return;

  if (previous?.modal && (next.fallbackModalIfMissing || next.drawerStep || next.sheetStep)) {
    if (next.tourAction) dispatchOnboardingTourAction(next.tourAction);
    runPrepareOnHighlight(next);
    await delay(80);
    if (next.element) await waitForTourElement(next.element, next.drawerStep ? 3500 : 600);
    return;
  }

  if (
    previous?.modal &&
    next.tourAction === "openDemoVisit" &&
    next.drawerStep &&
    isTechDrawerElement(next)
  ) {
    dispatchOnboardingTourAction("openDemoVisit");
    await delay(140);
    if (next.element) await waitForTourElement(next.element, 4500);
    return;
  }

  if (
    previous?.sheetStep &&
    next.sheetStep &&
    isAdminScheduleElement(previous) &&
    isAdminScheduleElement(next)
  ) {
    if (next.element) await waitForTourElement(next.element, 1800);
    return;
  }

  if (
    previous?.sheetStep &&
    isAdminScheduleElement(previous) &&
    (next.drawerStep || next.element?.includes("admin-opp"))
  ) {
    dispatchOnboardingTourAction("closeAdminDemoScheduleModal");
    await delay(100);
    if (next.tourAction) dispatchOnboardingTourAction(next.tourAction);
    runPrepareOnHighlight(next);
    await delay(200);
    if (next.element) await waitForTourElement(next.element, 3500);
    return;
  }

  if (
    previous?.drawerStep &&
    next.drawerStep &&
    previous.element?.includes("admin-opp") &&
    next.element?.includes("admin-opp") &&
    (next.tourAction || next.prepareOnHighlight)
  ) {
    if (next.tourAction) dispatchOnboardingTourAction(next.tourAction);
    runPrepareOnHighlight(next);
    await delay(180);
    if (next.element) await waitForTourElement(next.element, 3000);
    return;
  }

  if (
    next.tourAction === "openAdminDemoHistoryOpportunity" ||
    next.prepareOnHighlight === "openAdminDemoHistoryOpportunity" ||
    (next.element?.includes("admin-opp-report") &&
      (previous?.tourAction === "showAdminViewHistory" ||
        previous?.element?.includes("admin-nav-history") ||
        previous?.element?.includes("admin-history")))
  ) {
    if (next.tourAction) dispatchOnboardingTourAction(next.tourAction);
    runPrepareOnHighlight(next);
    await delay(200);
    if (next.element) await waitForTourElement(next.element, 4500);
    return;
  }

  if (
    next.element?.includes("admin-history") &&
    (previous?.tourAction === "showAdminViewHistory" ||
      previous?.element?.includes("admin-nav-history"))
  ) {
    dispatchOnboardingTourAction("showAdminViewHistory");
    await delay(160);
    await waitForTourElement(next.element, 2800);
    return;
  }

  if (
    next.element?.includes("admin-calendar") &&
    (previous?.element?.includes("admin-calendar") ||
      previous?.tourAction === "showAdminViewCalendar" ||
      previous?.prepareOnHighlight === "showAdminViewCalendar")
  ) {
    dispatchOnboardingTourAction("showAdminViewCalendar");
    await delay(120);
    if (next.element) await waitForTourElement(next.element, 2500);
    return;
  }

  if (
    next.element?.includes("admin-route") &&
    previous?.element?.includes("admin-route")
  ) {
    if (next.tourAction) dispatchOnboardingTourAction(next.tourAction);
    runPrepareOnHighlight(next);
    await delay(140);
    if (next.element) await waitForTourElement(next.element, 2500);
    return;
  }

  if (
    previous?.sheetStep &&
    next.sheetStep &&
    isTechAddServiceElement(previous) &&
    isTechAddServiceElement(next)
  ) {
    if (next.element) await waitForTourElement(next.element, 1800);
    return;
  }

  if (
    previous?.sheetStep &&
    isTechAddServiceElement(previous) &&
    next.drawerStep &&
    isTechDrawerElement(next)
  ) {
    dispatchOnboardingTourAction("closeAddServiceSheet");
    await delay(100);
    if (next.tourAction) dispatchOnboardingTourAction(next.tourAction);
    runPrepareOnHighlight(next);
    await delay(180);
    if (next.element) await waitForTourElement(next.element, 3500);
    return;
  }

  if (
    previous?.element?.includes("tech-drawer-extra-add") &&
    next.sheetStep &&
    isTechAddServiceElement(next)
  ) {
    dispatchOnboardingTourAction("openAddServiceSheet");
    await delay(120);
    if (next.element) await waitForTourElement(next.element, 3500);
    return;
  }

  if (
    previous?.drawerStep &&
    next.drawerStep &&
    isTechDrawerElement(previous) &&
    isTechDrawerElement(next)
  ) {
    if (next.tourAction) dispatchOnboardingTourAction(next.tourAction);
    runPrepareOnHighlight(next);
    await delay(next.tourAction ? 120 : 60);
    if (next.element) await waitForTourElement(next.element, next.tourAction ? 2800 : 1400);
    return;
  }

  if (
    previous &&
    isTechMeasurementsElement(previous) &&
    isTechMeasurementsElement(next)
  ) {
    if (next.tourAction === "seedDemoMeasurements") {
      dispatchOnboardingTourAction("seedDemoMeasurements");
    }
    runPrepareOnHighlight(next);
    await delay(60);
    if (next.element) await waitForTourElement(next.element, 1400);
    return;
  }

  if (
    next.element?.includes("tech-offline-banner") &&
    (previous?.element?.includes("tech-history") ||
      previous?.element?.includes("tech-history-sync-queue") ||
      previous?.tourAction === "showTechViewHistory")
  ) {
    dispatchOnboardingTourAction("closeTechSyncQueue");
    dispatchOnboardingTourAction("showTechViewMap");
    await delay(100);
    if (next.element) await waitForTourElement(next.element, 500);
    return;
  }

  if (
    previous?.sheetStep &&
    next.element?.includes("tech-history-sync-queue")
  ) {
    dispatchOnboardingTourAction("closeTechSyncQueue");
    dispatchOnboardingTourAction("showTechViewHistory");
    await delay(100);
    if (next.element) await waitForTourElement(next.element, 1800);
    return;
  }

  if (
    previous?.element?.includes("tech-header-sync-chip") &&
    next.sheetStep &&
    next.element?.includes("tech-sync-queue")
  ) {
    dispatchOnboardingTourAction("openTechSyncQueue");
    await delay(80);
    if (next.element) await waitForTourElement(next.element, 2000);
    return;
  }

  if (
    previous?.sheetStep &&
    previous.element?.includes("tech-sync-queue") &&
    next.element?.includes("tech-history-sync-queue")
  ) {
    dispatchOnboardingTourAction("closeTechSyncQueue");
    dispatchOnboardingTourAction("showTechViewHistory");
    await delay(90);
    if (next.element) await waitForTourElement(next.element, 1600);
    return;
  }

  if (
    previous?.modal &&
    next.element?.includes("tech-header-sync-chip")
  ) {
    dispatchOnboardingTourAction("showTechViewMap");
    await delay(60);
    if (next.element) await waitForTourElement(next.element, 450);
    return;
  }

  if (
    (next.element?.includes("tech-list-agenda") ||
      next.element?.includes("tech-demo-task")) &&
    (previous?.element?.includes("tech-nav-list") ||
      previous?.tourAction === "showTechViewList" ||
      previous?.prepareOnHighlight === "showTechViewList" ||
      previous?.element?.includes("tech-list"))
  ) {
    dispatchOnboardingTourAction("showTechViewList");
    await delay(140);
    if (next.element) await waitForTourElement(next.element, 2800);
    return;
  }

  if (
    next.element?.includes("tech-calendar") &&
    (previous?.element?.includes("tech-nav-calendar") ||
      previous?.tourAction === "showTechViewCalendar" ||
      previous?.prepareOnHighlight === "showTechViewCalendar" ||
      previous?.element?.includes("tech-calendar"))
  ) {
    dispatchOnboardingTourAction("showTechViewCalendar");
    await delay(120);
    if (next.element) await waitForTourElement(next.element, 2500);
    return;
  }

  if (
    next.element?.includes("tech-history") &&
    (previous?.element?.includes("tech-nav-history") ||
      previous?.tourAction === "showTechViewHistory" ||
      previous?.prepareOnHighlight === "showTechViewHistory" ||
      previous?.element?.includes("tech-history"))
  ) {
    dispatchOnboardingTourAction("showTechViewHistory");
    await delay(140);
    if (next.element) await waitForTourElement(next.element, 2800);
    return;
  }

  if (
    next.element?.includes("tech-map-canvas") &&
    (previous?.element?.includes("tech-nav-map") ||
      previous?.tourAction === "showTechViewMap" ||
      previous?.prepareOnHighlight === "showTechViewMap")
  ) {
    dispatchOnboardingTourAction("showTechViewMap");
    await delay(160);
    if (next.focusDemoPin) {
      await delay(120);
      dispatchOnboardingOpenDemoPin();
    }
    if (next.element) await waitForTourElement(next.element, 3500);
    return;
  }

  if (
    isTechDemoPopupStep(next) &&
    (previous?.element?.includes("tech-map-canvas") ||
      previous?.focusDemoPin ||
      previous?.element?.includes("tech-nav-map"))
  ) {
    dispatchOnboardingTourAction("showTechViewMap");
    await delay(140);
    dispatchOnboardingOpenDemoPin();
    await delay(220);
    if (next.element) await waitForTourElement(next.element, 4500);
    await waitForTechDemoPinPopup(3500);
    return;
  }

  if (
    next.drawerStep &&
    isTechDrawerElement(next) &&
    (next.tourAction === "openDemoVisit" || isTechDemoPopupStep(previous)) &&
    (isTechDemoPopupStep(previous) ||
      previous?.element?.includes("tech-map-canvas") ||
      previous?.focusDemoPin)
  ) {
    dispatchOnboardingTourAction("showTechViewMap");
    await delay(100);
    dispatchOnboardingTourAction("openDemoVisit");
    await delay(160);
    if (next.element) await waitForTourElement(next.element, 4500);
    return;
  }

  if (
    next.element?.includes("tech-map-day") &&
    (previous?.tourAction === "showTechViewMap" ||
      previous?.prepareOnHighlight === "showTechViewMap" ||
      previous?.element?.includes("tech-nav-map") ||
      previous?.element?.includes("tech-history"))
  ) {
    dispatchOnboardingTourAction("showTechViewMap");
    await delay(140);
    if (next.element) await waitForTourElement(next.element, 2800);
    return;
  }

  if (
    next.element?.includes("tech-nav-") &&
    (next.tourAction === "showTechViewMap" ||
      next.tourAction === "showTechViewList" ||
      next.tourAction === "showTechViewCalendar" ||
      next.tourAction === "showTechViewHistory")
  ) {
    dispatchOnboardingTourAction(next.tourAction);
    await delay(120);
    if (next.element) await waitForTourElement(next.element, 2200);
    return;
  }

  if (
    next.element?.includes("tech-nav-") &&
    (next.prepareOnHighlight === "showTechViewMap" ||
      next.prepareOnHighlight === "showTechViewList" ||
      next.prepareOnHighlight === "showTechViewCalendar" ||
      next.prepareOnHighlight === "showTechViewHistory")
  ) {
    dispatchOnboardingTourAction(next.prepareOnHighlight);
    await delay(120);
    if (next.element) await waitForTourElement(next.element, 2200);
    return;
  }

  await ensureTourStepReady(next);
}
