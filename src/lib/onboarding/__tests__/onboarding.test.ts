import { describe, it, expect } from "vitest";
import { parseOnboardingStore } from "@/lib/server/onboardingStore";
import {
  getTourIdForAppRole,
  getTourIdForSession,
  getHomePathForTourId,
  canAccessTourId,
} from "@/lib/onboarding/roleTour";
import {
  getAutostartChapterId,
  getChaptersForTour,
  ONBOARDING_ESSENTIALS_CHAPTER_ID,
} from "@/lib/onboarding/tours";
import {
  ONBOARDING_DEMO_TASK_ID,
  createAdminOnboardingDemoOpportunity,
  createTechnicianOnboardingDemoTask,
  taskListHasMapPin,
} from "@/lib/onboarding/demoMapPin";
import { shouldIncludeTourStep } from "@/lib/onboarding/tourStepVisibility";
import type { AppRole } from "@/lib/schemas/auth";

describe("parseOnboardingStore", () => {
  it("devolve store vazio para input inválido", () => {
    const store = parseOnboardingStore(null);
    expect(store.version).toBe(1);
    expect(store.users).toEqual({});
  });

  it("aceita ficheiro v1 válido", () => {
    const store = parseOnboardingStore({
      version: 1,
      users: {
        "user-1": {
          technician: {
            status: "completed",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        },
      },
    });
    expect(store.users["user-1"]?.technician?.status).toBe("completed");
  });

  it("migra legacy com users sem version", () => {
    const store = parseOnboardingStore({
      users: {
        "user-2": {
          admin: {
            status: "skipped",
            updatedAt: "2026-02-01T12:00:00.000Z",
          },
        },
      },
    });
    expect(store.version).toBe(1);
    expect(store.users["user-2"]?.admin?.status).toBe("skipped");
  });
});

describe("roleTour", () => {
  it("mapeia perfis Twenty para tour id", () => {
    expect(getTourIdForAppRole("technician")).toBe("technician");
    expect(getTourIdForAppRole("member")).toBe("admin");
    expect(getTourIdForAppRole("ceo")).toBe("ceo");
    expect(getHomePathForTourId("warehouse")).toBe("/armazem");
  });

  it("CEO em /admin usa guia operacional admin", () => {
    expect(getTourIdForSession("ceo", "/admin")).toBe("admin");
    expect(getTourIdForSession("ceo", "/ceo")).toBe("ceo");
  });

  it("canAccessTourId permite CEO no guia admin", () => {
    expect(canAccessTourId("ceo", "admin")).toBe(true);
    expect(canAccessTourId("member", "ceo")).toBe(false);
  });
});

describe("capítulos do guia", () => {
  it("tem capítulo essentials com no máximo 15 passos (técnico e admin)", () => {
    for (const tourId of ["technician", "admin"] as const) {
      const essentials = getChaptersForTour(tourId).find((c) => c.id === ONBOARDING_ESSENTIALS_CHAPTER_ID);
      expect(essentials).toBeDefined();
      expect(essentials!.steps.length).toBeLessThanOrEqual(15);
      expect(essentials!.steps[0]?.title.length).toBeGreaterThan(3);
    }
  });

  it("documenta a visita de formação NSI-GUIA-001 (técnico e admin)", () => {
    const techSteps = getChaptersForTour("technician").flatMap((c) => c.steps);
    expect(
      techSteps.some((s) => s.description.includes("NSI-GUIA-001"))
    ).toBe(true);
    const adminSteps = getChaptersForTour("admin").flatMap((c) => c.steps);
    expect(adminSteps.some((s) => s.focusDemoPin === true)).toBe(true);
  });

  it("ids de capítulo únicos por tour", () => {
    for (const tourId of ["technician", "admin", "warehouse", "ceo"] as const) {
      const ids = getChaptersForTour(tourId).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("autostart usa essentials ou default", () => {
    expect(getAutostartChapterId("technician")).toBe("essentials");
    expect(getAutostartChapterId("warehouse")).toBe("default");
  });
});

describe("shouldIncludeTourStep", () => {
  it("mantém passos com prepareOnHighlight mesmo sem âncora visível", () => {
    const step = {
      title: "t",
      description: "d",
      element: '[data-tour="admin-mobile-menu-sheet"]',
      prepareOnHighlight: "openAdminMobileMenu" as const,
    };
    expect(shouldIncludeTourStep(step, { role: "member" })).toBe(true);
  });

  it("filtra passos por perfil", () => {
    const step = {
      title: "SRE",
      description: "d",
      modal: true,
      roles: ["admin"] as AppRole[],
    };
    expect(shouldIncludeTourStep(step, { role: "member" })).toBe(false);
    expect(shouldIncludeTourStep(step, { role: "admin" })).toBe(true);
  });
});

describe("demoMapPin", () => {
  it("cria entidade fictícia com coordenadas e id estável", () => {
    const demo = createTechnicianOnboardingDemoTask();
    expect(demo.id).toBe(ONBOARDING_DEMO_TASK_ID);
    expect(demo.coordinates?.length).toBe(2);
    expect(taskListHasMapPin([])).toBe(false);
    expect(taskListHasMapPin([demo])).toBe(true);
  });

  it("admin demo mantém coordenadas e estado por agendar", () => {
    const demo = createAdminOnboardingDemoOpportunity();
    expect(demo.id).toBe(ONBOARDING_DEMO_TASK_ID);
    expect(demo.hasScheduledTask).toBe(false);
    expect(demo.coordinates?.length).toBe(2);
  });
});
