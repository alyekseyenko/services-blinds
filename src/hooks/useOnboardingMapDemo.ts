"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createOnboardingDemoEntity,
  isOnboardingDemoEntity,
  ONBOARDING_DEMO_TASK_ID,
} from "@/lib/onboarding/demoMapPin";
import {
  ONBOARDING_DEMO_PIN_ACTIVE_EVENT,
  ONBOARDING_DEMO_PIN_INACTIVE_EVENT,
  ONBOARDING_OPEN_DEMO_PIN_EVENT,
  type OnboardingDemoPinActiveDetail,
} from "@/lib/onboarding/events";
import type { OnboardingTourId } from "@/lib/schemas/onboarding";

export function useOnboardingMapDemo<T extends { id?: string; coordinates?: unknown }>(
  tasks: T[],
  tourId: OnboardingTourId
): {
  mapTasks: T[];
  openDemoPin: boolean;
  consumeOpenDemoPin: () => void;
  demoActive: boolean;
} {
  const [activeTourId, setActiveTourId] = useState<OnboardingTourId | null>(null);
  const [openDemoPin, setOpenDemoPin] = useState(false);

  useEffect(() => {
    const onActive = (event: Event) => {
      const detail = (event as CustomEvent<OnboardingDemoPinActiveDetail>).detail;
      setActiveTourId(detail.tourId);
    };
    const onInactive = () => {
      setActiveTourId(null);
      setOpenDemoPin(false);
    };
    const onOpen = () => setOpenDemoPin(true);

    window.addEventListener(ONBOARDING_DEMO_PIN_ACTIVE_EVENT, onActive);
    window.addEventListener(ONBOARDING_DEMO_PIN_INACTIVE_EVENT, onInactive);
    window.addEventListener(ONBOARDING_OPEN_DEMO_PIN_EVENT, onOpen);
    return () => {
      window.removeEventListener(ONBOARDING_DEMO_PIN_ACTIVE_EVENT, onActive);
      window.removeEventListener(ONBOARDING_DEMO_PIN_INACTIVE_EVENT, onInactive);
      window.removeEventListener(ONBOARDING_OPEN_DEMO_PIN_EVENT, onOpen);
    };
  }, []);

  const demoActive = activeTourId === tourId;

  const mapTasks = useMemo(() => {
    if (!demoActive) return tasks;
    if (tasks.some((t) => isOnboardingDemoEntity(t))) return tasks;
    const demo = createOnboardingDemoEntity(tourId);
    if (!demo) return tasks;
    return [...tasks, demo as unknown as T];
  }, [demoActive, tasks, tourId]);

  return {
    mapTasks,
    openDemoPin,
    consumeOpenDemoPin: () => setOpenDemoPin(false),
    demoActive,
  };
}

export { ONBOARDING_DEMO_TASK_ID };
