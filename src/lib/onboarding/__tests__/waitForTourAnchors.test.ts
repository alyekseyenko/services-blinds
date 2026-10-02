// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  isTourElementVisible,
  resolveTourStepElement,
} from "@/lib/onboarding/waitForTourAnchors";

describe("waitForTourAnchors", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("isTourElementVisible aceita âncora modal invisível", () => {
    document.body.innerHTML =
      '<div data-tour="app-tour-modal" class="opacity-0" style="width:1px;height:1px"></div>';
    const modal = document.querySelector('[data-tour="app-tour-modal"]')!;
    expect(isTourElementVisible(modal)).toBe(true);
  });

  it("fallbackModalIfMissing usa modal quando o alvo principal não existe", () => {
    document.body.innerHTML =
      '<div data-tour="app-tour-modal" style="width:1px;height:1px;opacity:0"></div>';
    const fn = resolveTourStepElement({
      element: '[data-tour="admin-map-filters"]',
      fallbackModalIfMissing: true,
    });
    expect(fn).toBeDefined();
    expect((fn!() as HTMLElement).dataset.tour).toBe("app-tour-modal");
  });

  it("sem fallbackModalIfMissing devolve fallback 1px se o alvo não existir", () => {
    const fn = resolveTourStepElement({
      element: '[data-tour="admin-map-filters"]',
    });
    expect((fn!() as HTMLElement).dataset.tour).toBe("app-tour-fallback-anchor");
  });

  it("isTourElementVisible não entra em recursão infinita", () => {
    document.body.innerHTML =
      '<div data-tour="admin-workspace" style="width:200px;height:100px"></div>';
    const el = document.querySelector('[data-tour="admin-workspace"]')!;
    expect(() => {
      for (let i = 0; i < 50; i += 1) isTourElementVisible(el);
    }).not.toThrow();
  });
});
