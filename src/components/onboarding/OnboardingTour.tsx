"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  getOnboardingStateAction,
  markOnboardingCompletedAction,
  markOnboardingSkippedAction,
} from "@/actions/onboarding-actions";
import {
  dispatchOnboardingDemoPinActive,
  dispatchOnboardingDemoPinInactive,
  ONBOARDING_ADD_SERVICE_SHEET_OPENED_EVENT,
  ONBOARDING_ADMIN_SCHEDULE_MODAL_OPENED_EVENT,
  ONBOARDING_DEMO_OPEN_FROM_MAP_EVENT,
  ONBOARDING_RESTART_EVENT,
  ONBOARDING_STOP_EVENT,
} from "@/lib/onboarding/events";
import { dispatchOnboardingTourAction } from "@/lib/onboarding/tourActions";
import {
  getAutostartChapterId,
  getChapterById,
  getChapterSteps,
  ONBOARDING_ESSENTIALS_CHAPTER_ID,
  type TourStepDefinition,
} from "@/lib/onboarding/tours";
import { runChapterStartActions } from "@/lib/onboarding/chapterStart";
import {
  getHomePathForTourId,
  getTourIdForSession,
  isOnboardingAutostartEnabled,
} from "@/lib/onboarding/roleTour";
import type { TourChapterId } from "@/lib/onboarding/chapters/types";
import type { OnboardingRestartDetail } from "@/lib/onboarding/events";
import {
  findFirstVisibleTourElement,
  resolveTourStepElement,
  scrollTourTargetIntoView,
  waitForTourAnchors,
  waitForTourElement,
  waitForRealTourElement,
} from "@/lib/onboarding/waitForTourAnchors";
import { shouldIncludeTourStep } from "@/lib/onboarding/tourStepVisibility";
import { shouldSkipTourScrollAndDriverRefresh } from "@/lib/onboarding/tourHighlight";
import {
  ensureTourStepReady,
  ensureTourStepReadyLight,
  ensureTourStepTransition,
  getStepWaitMs,
  isHeavyTourPrepare,
  reconcileTourHighlightAfterPrepare,
} from "@/lib/onboarding/tourPrepare";
import { resetTourUi } from "@/lib/onboarding/resetTourUi";
import type { AppRole } from "@/lib/schemas/auth";
import type { OnboardingTourId } from "@/lib/schemas/onboarding";
import { waitForPushOptInBeforeOnboarding } from "@/lib/onboarding/pushBeforeTour";

function isDrawerRelatedStep(def?: TourStepDefinition): boolean {
  if (!def) return false;
  if (def.drawerStep || def.sheetStep) return true;
  const el = def.element ?? "";
  return el.includes("tech-drawer") || el.includes("tech-add-service") || el.includes("admin-opp") || el.includes("admin-schedule") || el.includes("admin-mass-schedule");
}

function isTechDemoPopupStep(def?: TourStepDefinition): boolean {
  return Boolean(
    def?.element?.includes("onboarding-demo-pin") ||
      def?.element?.includes("tech-demo-open-visit")
  );
}

function isAdminScheduleModalStep(def?: TourStepDefinition): boolean {
  return Boolean(def?.element?.includes("admin-schedule-modal"));
}

function stepNeedsOnHighlightPrepare(def?: TourStepDefinition): boolean {
  if (!def) return false;
  return Boolean(
    def.tourAction || def.prepareOnHighlight || def.focusDemoPin || def.sheetStep
  );
}

async function waitForAdminScheduleModalOpen(timeoutMs = 8000): Promise<void> {
  await waitForTourElement('[data-tour="admin-schedule-dialog-root"]', timeoutMs);
  await waitForTourElement('[data-tour="admin-schedule-modal"]', Math.min(timeoutMs, 5000));
}

function syncTourHighlightPopoverMode(
  def: TourStepDefinition | undefined,
  tourDriver: Driver
): void {
  const active = tourDriver.getActiveElement();
  const usedFallbackAnchor =
    def &&
    !def.modal &&
    active instanceof HTMLElement &&
    (active.dataset.tour === "app-tour-modal" ||
      active.dataset.tour === "app-tour-fallback-anchor");

  if (def?.modal || usedFallbackAnchor) {
    document.documentElement.setAttribute("data-onboarding-modal-popover", "1");
  } else {
    document.documentElement.removeAttribute("data-onboarding-modal-popover");
  }
}

function buildDriveSteps(
  definitions: TourStepDefinition[],
  role: AppRole | undefined
): {
  steps: DriveStep[];
  meta: TourStepDefinition[];
} {
  const meta: TourStepDefinition[] = [];
  const steps = definitions
    .filter((step) => shouldIncludeTourStep(step, { role }))
    .map((step) => {
      meta.push(step);
      const elementFn = resolveTourStepElement(step);
      const waitMs = getStepWaitMs(step);

      const isMapCanvasStep =
        (step.element?.includes("admin-map-canvas") ||
          step.element?.includes("tech-map-canvas")) ??
        false;

      return {
        element: elementFn,
        waitForElement: waitMs,
        skipMissingElement: true,
        disableActiveInteraction: step.modal ? true : false,
        stagePadding: step.modal ? 0 : isMapCanvasStep ? 8 : undefined,
        stageRadius: step.modal ? 0 : isMapCanvasStep ? 16 : undefined,
        popover: {
          title: step.title,
          description: step.description,
          side:
            (step.side as "top" | "right" | "bottom" | "left" | undefined) ??
            (step.modal ? "bottom" : step.drawerStep ? "bottom" : undefined),
          align:
            step.align ??
            (step.modal || step.drawerStep ? "center" : undefined),
        },
      };
    });
  return { steps, meta };
}

export default function OnboardingTour() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const driverRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);
  const manualRunRef = useRef(false);
  const autostartCheckedRef = useRef(false);
  const metaRef = useRef<TourStepDefinition[]>([]);
  const goNextRef = useRef<((tourDriver: Driver) => Promise<void>) | null>(null);
  const tourRefreshTimerRef = useRef<number | null>(null);
  const activeTourIdRef = useRef<OnboardingTourId | null>(null);
  const chapterIdRef = useRef<TourChapterId>(ONBOARDING_ESSENTIALS_CHAPTER_ID);
  /** Invalida runTour assíncronos antigos (picker / autostart a sobrepor-se). */
  const tourRunSeqRef = useRef(0);
  const highlightPrepareGenRef = useRef(0);
  /** Passo já preparado em goNext antes do moveNext — evita ensureTourStepReady duplicado. */
  const prepreparedStepIndexRef = useRef<number | null>(null);

  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const tourId = getTourIdForSession(role, pathname ?? "");
  const homePath = tourId ? getHomePathForTourId(tourId) : null;

  const destroyDriver = useCallback(() => {
    tourRunSeqRef.current += 1;
    const activeTour = activeTourIdRef.current;
    if (tourRefreshTimerRef.current) {
      window.clearTimeout(tourRefreshTimerRef.current);
      tourRefreshTimerRef.current = null;
    }
    document.querySelector('[data-tour="app-tour-fallback-anchor"]')?.remove();
    document.documentElement.removeAttribute("data-onboarding-tour");
    document.documentElement.removeAttribute("data-onboarding-modal-popover");
    resetTourUi(activeTour);
    dispatchOnboardingDemoPinInactive();
    driverRef.current?.destroy();
    driverRef.current = null;
    startedRef.current = false;
    activeTourIdRef.current = null;
  }, []);

  const runTour = useCallback(
    async (options: { manual: boolean; chapterId?: TourChapterId }) => {
      const seq = ++tourRunSeqRef.current;
      const isStale = () => seq !== tourRunSeqRef.current;

      const activeTourId = getTourIdForSession(role, pathname ?? "");
      if (!activeTourId || !homePath || pathname !== homePath) return;

      const chapterId = options.chapterId ?? getAutostartChapterId(activeTourId);
      chapterIdRef.current = chapterId;
      activeTourIdRef.current = activeTourId;

      document.documentElement.setAttribute("data-onboarding-tour", activeTourId);
      if (activeTourId === "technician" || activeTourId === "admin") {
        dispatchOnboardingDemoPinActive(activeTourId);
      }
      await new Promise<void>((r) => window.requestAnimationFrame(() => r()));
      resetTourUi(activeTourId);
      await waitForTourAnchors(activeTourId);
      if (isStale()) return;

      const chapter = getChapterById(activeTourId, chapterId);
      if (chapter?.startActions?.length) {
        await runChapterStartActions(chapter.startActions);
      }
      if (isStale()) return;

      const definitions = getChapterSteps(activeTourId, chapterId);
      const { steps, meta } = buildDriveSteps(definitions, role);
      metaRef.current = meta;
      if (steps.length === 0) {
        activeTourIdRef.current = null;
        document.documentElement.removeAttribute("data-onboarding-tour");
        return;
      }

      manualRunRef.current = options.manual;
      let finishedViaDone = false;
      const primaryChapterId = getAutostartChapterId(activeTourId);

      const prepareNextStep = async (tourDriver: Driver) => {
        const current = tourDriver.getActiveIndex();
        if (current === undefined) return;
        const currentDef = metaRef.current[current];
        const nextDef = metaRef.current[current + 1];
        if (!nextDef) return;

        await ensureTourStepTransition(currentDef, nextDef);

        if (currentDef?.modal) {
          return;
        }

        if (
          currentDef?.element?.includes("tech-drawer-extra-add") &&
          nextDef?.sheetStep &&
          nextDef.element?.includes("tech-add-service")
        ) {
          dispatchOnboardingTourAction("openAddServiceSheet");
          await waitForTourElement('[data-tour="tech-add-service-panel"]', 8000);
          await new Promise((r) => window.setTimeout(r, 120));
          tourDriver.refresh();
        }

        if (
          currentDef?.element?.includes("admin-opp-schedule-btn") &&
          isAdminScheduleModalStep(nextDef)
        ) {
          dispatchOnboardingTourAction("openAdminDemoScheduleModal");
          await waitForAdminScheduleModalOpen();
          await new Promise((r) => window.setTimeout(r, 150));
          tourDriver.refresh();
        }

        if (
          currentDef &&
          isDrawerRelatedStep(currentDef) &&
          !isDrawerRelatedStep(nextDef)
        ) {
          dispatchOnboardingTourAction("closeAddServiceSheet");
          if (activeTourId === "technician") {
            dispatchOnboardingTourAction("closeDemoVisit");
          }
          if (activeTourId === "admin") {
            dispatchOnboardingTourAction("closeAdminDemoScheduleModal");
            dispatchOnboardingTourAction("closeAdminDemoOpportunity");
          }
          await new Promise((r) => window.setTimeout(r, 120));
          tourDriver.refresh();
        }

        if (nextDef.tourAction === "openAdminDemoScheduleModal") {
          dispatchOnboardingTourAction("openAdminDemoScheduleModal");
          await waitForAdminScheduleModalOpen();
          await new Promise((r) => window.setTimeout(r, 100));
          tourDriver.refresh();
        }

        if (
          activeTourId === "technician" &&
          isTechDemoPopupStep(nextDef) &&
          (currentDef?.element?.includes("tech-map-canvas") || currentDef?.focusDemoPin)
        ) {
          await new Promise((r) => window.setTimeout(r, 80));
          tourDriver.refresh();
        }

        if (
          activeTourId === "technician" &&
          nextDef?.tourAction === "openDemoVisit" &&
          (isTechDemoPopupStep(currentDef) || currentDef?.element?.includes("tech-map-canvas"))
        ) {
          await waitForTourElement('[data-tour="tech-drawer"]', 5500);
          await new Promise((r) => window.setTimeout(r, 100));
          tourDriver.refresh();
        }
      };

      let advancing = false;

      const goNext = async (tourDriver: Driver) => {
        if (advancing) return;
        advancing = true;
        try {
          const current = tourDriver.getActiveIndex();
          const nextIdx = current !== undefined ? current + 1 : undefined;
          const nextDef =
            nextIdx !== undefined ? metaRef.current[nextIdx] : undefined;
          try {
            await prepareNextStep(tourDriver);
          } catch {
            /* preparação falhou — tentar avançar na mesma */
          }
          if (nextDef && !nextDef.modal) {
            const prepare = isHeavyTourPrepare(nextDef)
              ? ensureTourStepReady
              : ensureTourStepReadyLight;
            try {
              await prepare(nextDef);
            } catch {
              /* manter avanço */
            }
            prepreparedStepIndexRef.current = nextIdx ?? null;
          } else {
            prepreparedStepIndexRef.current = null;
          }
          if (
            nextDef?.element &&
            !nextDef.modal &&
            !nextDef.fallbackModalIfMissing
          ) {
            const waitMs =
              nextDef.drawerStep || nextDef.sheetStep ? 5500 : 3200;
            await waitForRealTourElement(nextDef.element, waitMs);
          }
          tourDriver.moveNext();
          await new Promise((r) => window.setTimeout(r, 40));
          if (nextDef) {
            reconcileTourHighlightAfterPrepare(tourDriver, nextDef);
          }
          tourDriver.refresh();
          syncTourHighlightPopoverMode(metaRef.current[tourDriver.getActiveIndex() ?? -1], tourDriver);
        } finally {
          advancing = false;
        }
      };
      goNextRef.current = goNext;

      const d = driver({
        steps,
        animate: false,
        allowClose: true,
        overlayColor: "rgb(2, 6, 23)",
        overlayOpacity: 0.86,
        overlayClickBehavior: () => {
          /* evita fechar o guia ao tocar no overlay por engano */
        },
        showProgress: true,
        progressText: "{{current}} de {{total}}",
        nextBtnText: "Seguinte",
        prevBtnText: "Anterior",
        doneBtnText: "Concluir",
        popoverClass: "app-tour-popover",
        skipMissingElement: true,
        waitForElement: 1800,
        smoothScroll: false,
        stagePadding: 10,
        stageRadius: 14,
        disableActiveInteraction: false,
        allowKeyboardControl: true,
        onHighlightStarted: (_el, _step, { driver: tourDriver }) => {
          const idx = tourDriver.getActiveIndex();
          if (idx === undefined) return;
          const def = metaRef.current[idx];
          syncTourHighlightPopoverMode(def, tourDriver);
        },
        onHighlighted: (_el, _step, { driver: tourDriver }) => {
          const idx = tourDriver.getActiveIndex();
          const def = idx !== undefined ? metaRef.current[idx] : undefined;
          syncTourHighlightPopoverMode(def, tourDriver);
          const el = tourDriver.getActiveElement();

          if (def && stepNeedsOnHighlightPrepare(def)) {
            const gen = (highlightPrepareGenRef.current += 1);
            const skipHeavyPrepare =
              idx !== undefined && idx === prepreparedStepIndexRef.current;
            if (skipHeavyPrepare) {
              prepreparedStepIndexRef.current = null;
            }
            void (async () => {
              try {
                if (skipHeavyPrepare) {
                  reconcileTourHighlightAfterPrepare(tourDriver, def);
                  tourDriver.refresh();
                } else {
                  const prepare = isHeavyTourPrepare(def)
                    ? ensureTourStepReady
                    : ensureTourStepReadyLight;
                  await prepare(def);
                }
                if (gen !== highlightPrepareGenRef.current) return;
                if (!skipHeavyPrepare) {
                  reconcileTourHighlightAfterPrepare(tourDriver, def);
                  tourDriver.refresh();
                }
                const afterIdx = tourDriver.getActiveIndex();
                syncTourHighlightPopoverMode(
                  afterIdx !== undefined ? metaRef.current[afterIdx] : undefined,
                  tourDriver
                );
                const afterEl = tourDriver.getActiveElement();
                if (
                  afterEl &&
                  !shouldSkipTourScrollAndDriverRefresh(afterEl) &&
                  afterEl instanceof HTMLElement &&
                  afterEl.dataset.tour !== "app-tour-modal" &&
                  afterEl.dataset.tour !== "app-tour-fallback-anchor"
                ) {
                  scrollTourTargetIntoView(afterEl);
                }
              } catch {
                /* preparação falhou — manter highlight actual */
              }
            })();
            return;
          }

          if (!el) return;
          if (shouldSkipTourScrollAndDriverRefresh(el)) {
            return;
          }
          if (
            el instanceof HTMLElement &&
            (el.dataset.tour === "app-tour-modal" ||
              el.dataset.tour === "app-tour-fallback-anchor")
          ) {
            return;
          }
          scrollTourTargetIntoView(el);
        },
        onNextClick: (_el, _step, { driver: tourDriver }) => {
          void goNext(tourDriver);
        },
        onPrevClick: (_el, _step, { driver: tourDriver }) => {
          if (advancing) return;
          const current = tourDriver.getActiveIndex();
          if (current === undefined || current <= 0) {
            tourDriver.movePrevious();
            return;
          }

          const def = metaRef.current[current];
          const prevDef = metaRef.current[current - 1];

          const finishPrev = () => {
            void (async () => {
              advancing = true;
              try {
                await ensureTourStepTransition(def, prevDef);
                tourDriver.movePrevious();
                syncTourHighlightPopoverMode(prevDef, tourDriver);
              } finally {
                advancing = false;
              }
            })();
          };

          if (prevDef && isDrawerRelatedStep(prevDef) && def && !isDrawerRelatedStep(def)) {
            if (activeTourId === "admin") {
              dispatchOnboardingTourAction("openAdminDemoOpportunity");
            } else if (activeTourId === "technician") {
              dispatchOnboardingTourAction("openDemoVisit");
            }
            void (async () => {
              if (advancing) return;
              advancing = true;
              try {
                const drawerSel =
                  activeTourId === "admin"
                    ? '[data-tour="admin-opp-drawer"]'
                    : '[data-tour="tech-drawer"]';
                await waitForTourElement(drawerSel, 8000);
                await ensureTourStepTransition(def, prevDef);
                tourDriver.movePrevious();
                syncTourHighlightPopoverMode(prevDef, tourDriver);
              } finally {
                advancing = false;
              }
            })();
            return;
          }

          if (isDrawerRelatedStep(def) && !isDrawerRelatedStep(prevDef)) {
            dispatchOnboardingTourAction("closeAddServiceSheet");
            if (activeTourId === "technician") {
              dispatchOnboardingTourAction("closeDemoVisit");
            }
            if (activeTourId === "admin") {
              dispatchOnboardingTourAction("closeAdminDemoScheduleModal");
              dispatchOnboardingTourAction("closeAdminDemoOpportunity");
            }
          }
          if (
            def?.sheetStep &&
            prevDef &&
            !prevDef.sheetStep &&
            def.element?.includes("admin-schedule")
          ) {
            dispatchOnboardingTourAction("closeAdminDemoScheduleModal");
            if (prevDef.element?.includes("admin-opp")) {
              dispatchOnboardingTourAction("openAdminDemoOpportunity");
            }
          }
          if (
            def?.sheetStep &&
            prevDef &&
            !prevDef.sheetStep &&
            !prevDef.element?.includes("tech-add-service") &&
            !def.element?.includes("admin-schedule")
          ) {
            dispatchOnboardingTourAction("closeAddServiceSheet");
          }

          finishPrev();
        },
        onDoneClick: (_el, _step, { driver: tourDriver }) => {
          finishedViaDone = true;
          tourDriver.destroy();
        },
        onDestroyed: () => {
          document.documentElement.removeAttribute("data-onboarding-tour");
          document.documentElement.removeAttribute("data-onboarding-modal-popover");
          resetTourUi(activeTourId);
          dispatchOnboardingDemoPinInactive();
          driverRef.current = null;
          startedRef.current = false;
          const completedChapter = chapterIdRef.current;
          void (async () => {
            if (finishedViaDone && completedChapter === primaryChapterId) {
              await markOnboardingCompletedAction({ tourId: activeTourId });
              return;
            }
            if (
              !manualRunRef.current &&
              autostartCheckedRef.current &&
              completedChapter === primaryChapterId
            ) {
              await markOnboardingSkippedAction({ tourId: activeTourId });
            }
          })();
        },
      });

      await ensureTourStepReady(meta[0]);
      if (isStale()) {
        d.destroy();
        return;
      }

      driverRef.current = d;
      startedRef.current = true;
      d.drive();
      syncTourHighlightPopoverMode(meta[0], d);
    },
    [homePath, pathname, role]
  );

  useEffect(() => {
    if (status !== "authenticated" || !tourId || !homePath) return;
    if (pathname !== homePath) {
      destroyDriver();
      return;
    }

    let cancelled = false;

    const maybeAutostart = async () => {
      if (!isOnboardingAutostartEnabled()) {
        autostartCheckedRef.current = true;
        return;
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      const res = await getOnboardingStateAction({ tourId });
      if (cancelled || !res.success || !res.data) return;
      autostartCheckedRef.current = true;

      const { status: tourStatus } = res.data;
      if (tourStatus === "completed" || tourStatus === "skipped") return;

      await waitForPushOptInBeforeOnboarding();
      if (cancelled) return;

      window.setTimeout(() => {
        if (!cancelled) {
          void runTour({
            manual: false,
            chapterId: getAutostartChapterId(tourId),
          });
        }
      }, 400);
    };

    void maybeAutostart();

    return () => {
      cancelled = true;
    };
  }, [destroyDriver, homePath, pathname, runTour, status, tourId]);

  useEffect(() => {
    const onStop = () => {
      destroyDriver();
    };
    window.addEventListener(ONBOARDING_STOP_EVENT, onStop);
    return () => window.removeEventListener(ONBOARDING_STOP_EVENT, onStop);
  }, [destroyDriver]);

  useEffect(() => {
    const onRestart = (event: Event) => {
      const detail = (event as CustomEvent<OnboardingRestartDetail>).detail;
      const sessionTourId = getTourIdForSession(role, pathname ?? "");
      if (detail?.tourId && sessionTourId && detail.tourId !== sessionTourId) {
        return;
      }
      destroyDriver();
      window.setTimeout(() => {
        void runTour({
          manual: true,
          chapterId:
            detail?.chapterId ??
            (sessionTourId ? getAutostartChapterId(sessionTourId) : undefined),
        });
      }, 180);
    };
    window.addEventListener(ONBOARDING_RESTART_EVENT, onRestart);
    return () => window.removeEventListener(ONBOARDING_RESTART_EVENT, onRestart);
  }, [destroyDriver, pathname, role, runTour]);

  useEffect(() => {
    const onDemoOpenFromMap = () => {
      const tourDriver = driverRef.current;
      if (!tourDriver) return;
      const idx = tourDriver.getActiveIndex();
      if (idx === undefined) return;
      const def = metaRef.current[idx];
      const onDemoPopup =
        def?.element?.includes("onboarding-demo-pin") ||
        def?.element?.includes("tech-demo-open-visit") ||
        def?.element?.includes("admin-demo-open-opportunity");
      if (!onDemoPopup) return;
      void goNextRef.current?.(tourDriver);
    };
    window.addEventListener(ONBOARDING_DEMO_OPEN_FROM_MAP_EVENT, onDemoOpenFromMap);
    return () =>
      window.removeEventListener(ONBOARDING_DEMO_OPEN_FROM_MAP_EVENT, onDemoOpenFromMap);
  }, []);

  useEffect(() => {
    const onSheetOpened = () => {
      const tourDriver = driverRef.current;
      if (!tourDriver) return;
      const idx = tourDriver.getActiveIndex();
      if (idx === undefined) return;
      const def = metaRef.current[idx];
      if (!def?.element?.includes("tech-drawer-extra-add")) return;
      void goNextRef.current?.(tourDriver);
    };
    window.addEventListener(ONBOARDING_ADD_SERVICE_SHEET_OPENED_EVENT, onSheetOpened);
    return () => window.removeEventListener(ONBOARDING_ADD_SERVICE_SHEET_OPENED_EVENT, onSheetOpened);
  }, []);

  useEffect(() => {
    const onScheduleModalOpened = () => {
      const tourDriver = driverRef.current;
      if (!tourDriver) return;
      tourDriver.refresh();
      const idx = tourDriver.getActiveIndex();
      if (idx === undefined) return;
      const def = metaRef.current[idx];
      if (def?.element?.includes("admin-opp-schedule-btn")) {
        void goNextRef.current?.(tourDriver);
      }
    };
    window.addEventListener(ONBOARDING_ADMIN_SCHEDULE_MODAL_OPENED_EVENT, onScheduleModalOpened);
    return () =>
      window.removeEventListener(ONBOARDING_ADMIN_SCHEDULE_MODAL_OPENED_EVENT, onScheduleModalOpened);
  }, []);

  useEffect(() => () => destroyDriver(), [destroyDriver]);

  return (
    <div
      data-tour="app-tour-modal"
      className="pointer-events-none fixed left-1/2 top-1/2 z-[10040] h-px w-px -translate-x-1/2 -translate-y-1/2 opacity-0"
      aria-hidden
    />
  );
}
