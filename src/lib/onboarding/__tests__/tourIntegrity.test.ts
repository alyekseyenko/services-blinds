/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { getChaptersForTour } from "@/lib/onboarding/tours";
import type { TourStepDefinition } from "@/lib/onboarding/chapters/types";
import type { OnboardingTourAction } from "@/lib/onboarding/tourActions";
import { shouldIncludeTourStep } from "@/lib/onboarding/tourStepVisibility";
import { ONBOARDING_ESSENTIALS_CHAPTER_ID } from "@/lib/onboarding/tours";
import { createAdminOnboardingDemoOpportunityCompleted } from "@/lib/onboarding/demoMapPin";

const SRC_ROOT = join(process.cwd(), "src");

function walkTsxFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      walkTsxFiles(full, acc);
    } else if (/\.(tsx|ts)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

const SOURCE_BUNDLE = walkTsxFiles(SRC_ROOT).map((p) => readFileSync(p, "utf8")).join("\n");

function extractTourAnchorsFromElement(element?: string): string[] {
  if (!element) return [];
  const match = element.match(/data-tour="([^"]+)"/);
  return match ? [match[1]] : [];
}

function anchorExistsInSource(anchor: string): boolean {
  if (anchor === "app-tour-modal") return true;
  if (anchor.startsWith("admin-nav-") || anchor.startsWith("tech-nav-")) {
    const id = anchor.replace(/^(admin|tech)-nav-/, "");
    return (
      SOURCE_BUNDLE.includes(`admin-nav-${id}`) ||
      SOURCE_BUNDLE.includes(`tech-nav-${id}`) ||
      SOURCE_BUNDLE.includes(`\`admin-nav-\${`) ||
      SOURCE_BUNDLE.includes(`\`tech-nav-\${`)
    );
  }
  const patterns = [
    `data-tour="${anchor}"`,
    `dataTour="${anchor}"`,
    `panelDataTour="${anchor}"`,
    `data-tour={${JSON.stringify(anchor)}`,
  ];
  return patterns.some((p) => SOURCE_BUNDLE.includes(p));
}

function collectStepActions(step: TourStepDefinition): OnboardingTourAction[] {
  const actions: OnboardingTourAction[] = [];
  if (step.tourAction) actions.push(step.tourAction);
  const prep = step.prepareOnHighlight;
  if (prep) {
    if (Array.isArray(prep)) actions.push(...prep);
    else actions.push(prep);
  }
  return actions;
}

const RESET_ONLY_ACTIONS = new Set<OnboardingTourAction>([
  "closeAdminMobileMenu",
  "closeAdminDesktopMenu",
  "closeTechMobileMenu",
  "closeAddServiceSheet",
  "closeTechSyncQueue",
  "closeDemoVisit",
  "closeAdminDemoOpportunity",
  "closeAdminDemoScheduleModal",
  "closeAdminDemoMassSchedule",
  "stopAdminDemoTechnicianAnimation",
  "closeAdminMapFiltersPanel",
  "closeAdminMapZonesPanel",
  "stopAdminDemoRouteSelection",
]);

function actionHasHandler(action: OnboardingTourAction): boolean {
  if (RESET_ONLY_ACTIONS.has(action)) return true;
  const patterns = [
    `case "${action}"`,
    `action === "${action}"`,
    `'${action}'`,
  ];
  const tourActionsFile = readFileSync(
    join(SRC_ROOT, "lib/onboarding/tourActions.ts"),
    "utf8"
  );
  const withoutDispatch = SOURCE_BUNDLE.replace(tourActionsFile, "");
  return patterns.some((p) => withoutDispatch.includes(p));
}

describe("integridade dos guias", () => {
  it("cada âncora dos capítulos existe no código", () => {
    const missing: string[] = [];
    for (const tourId of ["technician", "admin", "warehouse", "ceo"] as const) {
      for (const chapter of getChaptersForTour(tourId)) {
        for (const step of chapter.steps) {
          for (const anchor of extractTourAnchorsFromElement(step.element)) {
            if (!anchorExistsInSource(anchor)) {
              missing.push(`${tourId}/${chapter.id}: ${anchor}`);
            }
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("cada tourAction/prepareOnHighlight tem handler na app", () => {
    const missing: string[] = [];
    for (const tourId of ["technician", "admin", "warehouse", "ceo"] as const) {
      for (const chapter of getChaptersForTour(tourId)) {
        for (const action of chapter.startActions ?? []) {
          if (!actionHasHandler(action)) {
            missing.push(`${tourId}/${chapter.id} start: ${action}`);
          }
        }
        for (const step of chapter.steps) {
          for (const action of collectStepActions(step)) {
            if (!actionHasHandler(action)) {
              missing.push(`${tourId}/${chapter.id}: ${action}`);
            }
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("primeiro passo de cada capítulo é modal", () => {
    for (const tourId of ["technician", "admin", "warehouse", "ceo"] as const) {
      for (const chapter of getChaptersForTour(tourId)) {
        expect(chapter.steps[0]?.modal).toBe(true);
      }
    }
  });

  it("essentials tem no máximo 15 passos visíveis por viewport (técnico e admin)", () => {
    const viewports = [
      { label: "mobile", width: 390 },
      { label: "desktop", width: 1280 },
    ] as const;

    for (const vp of viewports) {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string) => ({
          matches: query.includes("768")
            ? vp.width >= 768
            : vp.width < 768,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }),
      });

      for (const tourId of ["technician", "admin"] as const) {
        const essentials = getChaptersForTour(tourId).find(
          (c) => c.id === ONBOARDING_ESSENTIALS_CHAPTER_ID
        );
        expect(essentials).toBeDefined();
        const visible = essentials!.steps.filter((s) =>
          shouldIncludeTourStep(s, { role: tourId === "admin" ? "member" : "technician" })
        );
        expect(visible.length).toBeLessThanOrEqual(15);
      }
    }
  });
});

describe("createAdminOnboardingDemoOpportunityCompleted", () => {
  it("inclui relatório do técnico e estado concluído", () => {
    const demo = createAdminOnboardingDemoOpportunityCompleted();
    expect(demo.taskStatus).toBe("CONCLUIDO");
    expect(demo.technicianReport).toContain("guia");
  });
});
