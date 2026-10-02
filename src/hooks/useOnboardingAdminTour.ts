"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { flushSync } from "react-dom";
import {
  createAdminOnboardingDemoOpportunity,
  createAdminOnboardingDemoOpportunityCompleted,
  createAdminOnboardingDemoOpportunityInProgress,
  createAdminOnboardingDemoOpportunityScheduled,
  isOnboardingDemoEntity,
} from "@/lib/onboarding/demoMapPin";
import {
  ONBOARDING_TOUR_ACTION_EVENT,
  dispatchOnboardingTourAction,
  type OnboardingTourAction,
  type OnboardingTourActionDetail,
} from "@/lib/onboarding/tourActions";
import { dispatchOnboardingCloseMapPopup } from "@/lib/onboarding/events";
import type { Opportunity } from "@/types/admin";

type Handlers = {
  demoActive: boolean;
  setView: (view: string) => void;
  setSelectedOpportunity: Dispatch<SetStateAction<Opportunity | null>>;
  setMapTab: (tab: string) => void;
};

export function useOnboardingAdminTour({
  demoActive,
  setView,
  setSelectedOpportunity,
  setMapTab,
}: Handlers) {
  useEffect(() => {
    if (!demoActive) return;

    const onAction = (event: Event) => {
      const action = (event as CustomEvent<OnboardingTourActionDetail>).detail?.action;
      if (!action) return;

      switch (action) {
        case "openAdminDemoOpportunity":
          dispatchOnboardingCloseMapPopup();
          flushSync(() => {
            setView("map");
            setMapTab("unscheduled");
            setSelectedOpportunity((current) => {
              if (isOnboardingDemoEntity(current)) return current;
              return createAdminOnboardingDemoOpportunity() as Opportunity;
            });
          });
          break;
        case "openAdminDemoHistoryOpportunity":
          flushSync(() => {
            setView("history");
            setSelectedOpportunity(
              createAdminOnboardingDemoOpportunityCompleted() as Opportunity
            );
          });
          break;
        case "closeAdminDemoOpportunity":
          setSelectedOpportunity(null);
          break;
        case "showAdminViewMap":
          dispatchOnboardingTourAction("closeAdminMobileMenu");
          flushSync(() => {
            setSelectedOpportunity(null);
            setView("map");
          });
          break;
        case "showAdminViewCalendar":
          dispatchOnboardingTourAction("closeAdminMobileMenu");
          flushSync(() => {
            setSelectedOpportunity(null);
            setView("calendar");
          });
          break;
        case "showAdminViewHistory":
          dispatchOnboardingTourAction("closeAdminMobileMenu");
          flushSync(() => {
            setSelectedOpportunity(null);
            setView("history");
          });
          break;
        case "setAdminMapTabScheduled":
          setMapTab("scheduled");
          break;
        case "setAdminMapTabUnscheduled":
          setMapTab("unscheduled");
          break;
        case "setAdminDemoOpportunityScheduled":
          flushSync(() => {
            setView("map");
            setSelectedOpportunity(
              createAdminOnboardingDemoOpportunityScheduled() as Opportunity
            );
          });
          break;
        case "setAdminDemoOpportunityInProgress":
          flushSync(() => {
            setView("map");
            setSelectedOpportunity(
              createAdminOnboardingDemoOpportunityInProgress() as Opportunity
            );
          });
          break;
        default:
          break;
      }
    };

    window.addEventListener(ONBOARDING_TOUR_ACTION_EVENT, onAction);
    return () => window.removeEventListener(ONBOARDING_TOUR_ACTION_EVENT, onAction);
  }, [demoActive, setMapTab, setSelectedOpportunity, setView]);
}

export { isOnboardingDemoEntity };
