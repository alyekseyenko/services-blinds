"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { flushSync } from "react-dom";
import {
  createTechnicianOnboardingDemoTask,
  isOnboardingDemoEntity,
  normalizeTechnicianDemoTask,
} from "@/lib/onboarding/demoMapPin";
import { seedOnboardingDemoMeasurementsDraft } from "@/lib/onboarding/demoMeasurementsSeed";
import {
  ONBOARDING_TOUR_ACTION_EVENT,
  type OnboardingTourAction,
  type OnboardingTourActionDetail,
} from "@/lib/onboarding/tourActions";
import { dispatchOnboardingCloseMapPopup } from "@/lib/onboarding/events";

type Handlers = {
  demoActive: boolean;
  setSelectedTask: Dispatch<SetStateAction<unknown | null>>;
  setView?: (view: string) => void;
};

export function useOnboardingTechnicianTour({ demoActive, setSelectedTask, setView }: Handlers) {
  useEffect(() => {
    if (!demoActive) return;

    const onAction = (event: Event) => {
      const action = (event as CustomEvent<OnboardingTourActionDetail>).detail?.action;
      if (!action) return;

      if (action === "openDemoVisit") {
        dispatchOnboardingCloseMapPopup();
        flushSync(() => {
          setView?.("map");
          setSelectedTask((current: unknown | null) => {
            if (isOnboardingDemoEntity(current as { id?: string } | null)) {
              return current;
            }
            return normalizeTechnicianDemoTask(createTechnicianOnboardingDemoTask());
          });
        });
        return;
      }

      if (action === "closeDemoVisit") {
        setSelectedTask(null);
        return;
      }

      if (action === "showTechViewMap") {
        flushSync(() => {
          setSelectedTask(null);
          setView?.("map");
        });
        return;
      }
      if (action === "showTechViewList") {
        flushSync(() => {
          setSelectedTask(null);
          setView?.("list");
        });
        return;
      }
      if (action === "showTechViewCalendar") {
        flushSync(() => {
          setSelectedTask(null);
          setView?.("calendar");
        });
        return;
      }
      if (action === "showTechViewHistory") {
        flushSync(() => {
          setSelectedTask(null);
          setView?.("history");
        });
        return;
      }

      if (action === "seedDemoMeasurements") {
        seedOnboardingDemoMeasurementsDraft();
        window.dispatchEvent(
          new CustomEvent<OnboardingTourActionDetail>(ONBOARDING_TOUR_ACTION_EVENT, {
            detail: { action: "drawerTabMeasurements" },
          })
        );
        return;
      }
    };

    window.addEventListener(ONBOARDING_TOUR_ACTION_EVENT, onAction);
    return () => window.removeEventListener(ONBOARDING_TOUR_ACTION_EVENT, onAction);
  }, [demoActive, setSelectedTask, setView]);
}

export function appendDemoTaskToDayList<T extends { id?: string }>(dayTasks: T[], demoActive: boolean): T[] {
  if (!demoActive) return dayTasks;
  const demo = normalizeTechnicianDemoTask(createTechnicianOnboardingDemoTask()) as unknown as T;
  if (dayTasks.some((t) => t.id === demo.id)) return dayTasks;
  return [...dayTasks, demo];
}

export { isOnboardingDemoEntity };
