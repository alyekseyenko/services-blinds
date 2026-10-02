import type { AppRole } from "@/lib/schemas/auth";
import type { OnboardingTourAction } from "@/lib/onboarding/tourActions";

export type TourViewport = "mobile" | "desktop";

export type TourStepDefinition = {
  element?: string;
  title: string;
  description: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  modal?: boolean;
  focusDemoPin?: boolean;
  tourAction?: OnboardingTourAction;
  fallbackModalIfMissing?: boolean;
  drawerStep?: boolean;
  sheetStep?: boolean;
  prepareOnHighlight?: OnboardingTourAction | OnboardingTourAction[];
  /** Limita o passo a estes perfis Twenty→app (omitido = todos). */
  roles?: AppRole[];
  /** Limita o passo a mobile ou desktop (omitido = ambos). */
  viewport?: TourViewport;
};

export type TourChapterId =
  | "essentials"
  | "visit-flow"
  | "measurements"
  | "views"
  | "offline-sync"
  | "map-filters"
  | "schedule-cancel"
  | "routes-mass"
  | "calendar-history"
  | "default";

export type TourChapter = {
  id: TourChapterId;
  title: string;
  description: string;
  steps: TourStepDefinition[];
  /** Executado uma vez ao iniciar o capítulo (após reset da UI). */
  startActions?: OnboardingTourAction[];
  /** Capítulo só visível para estes perfis (omitido = todos com acesso ao tour). */
  roles?: AppRole[];
};
