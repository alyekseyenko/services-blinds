import type { OnboardingTourId } from "@/lib/schemas/onboarding";
import { TOUR_MODAL_SELECTOR } from "@/lib/onboarding/tourDom";

const ADMIN_READY_SELECTOR = '[data-tour="admin-map-filters"], [data-tour="admin-workspace"]';

const TECHNICIAN_READY_SELECTOR =
  '[data-tour="tech-bottom-nav"], [data-tour="tech-nav-map"]';

function clippedVisibleArea(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const x1 = Math.max(0, rect.left);
  const y1 = Math.max(0, rect.top);
  const x2 = Math.min(window.innerWidth, rect.right);
  const y2 = Math.min(window.innerHeight, rect.bottom);
  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);
  return w * h;
}

function elementLayoutArea(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    return clippedVisibleArea(el);
  }
  if (el.offsetWidth > 0 && el.offsetHeight > 0) {
    return el.offsetWidth * el.offsetHeight;
  }
  return 0;
}

function tourAnchorVisibleArea(el: Element): number {
  if (!(el instanceof HTMLElement)) return 0;
  return clippedVisibleArea(el);
}

export function isTourElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tourId = el.dataset.tour;
  if (
    tourId === "app-tour-modal" ||
    tourId === "app-tour-fallback-anchor" ||
    tourId === "onboarding-demo-pin" ||
    tourId === "tech-demo-open-visit"
  ) {
    return true;
  }
  if (el.closest(".gm-style-iw-c, .gm-style-iw-d")) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
  }

  if (typeof el.checkVisibility === "function") {
    try {
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
        const earlyRect = el.getBoundingClientRect();
        if (
          el.offsetWidth <= 0 &&
          el.offsetHeight <= 0 &&
          earlyRect.width <= 0 &&
          earlyRect.height <= 0
        ) {
          return false;
        }
      }
    } catch {
      /* jsdom ou browsers antigos */
    }
  }

  const rect = el.getBoundingClientRect();
  const hasLayout =
    rect.width > 0 ||
    rect.height > 0 ||
    el.offsetWidth > 0 ||
    el.offsetHeight > 0;
  if (!hasLayout) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (style.opacity === "0") return false;

  if (rect.width > 0 && rect.height > 0 && clippedVisibleArea(el) <= 0) return false;
  return true;
}

/** Escolhe o alvo com maior área visível (evita duplicados no menu móvel vs desktop). */
export function findBestVisibleTourElement(selector: string): Element | null {
  const nodes = document.querySelectorAll(selector);
  let best: Element | null = null;
  let bestArea = 0;
  for (const el of nodes) {
    if (!(el instanceof HTMLElement)) continue;
    if (!isTourElementVisible(el)) continue;
    const tourId = el.dataset.tour;
    const area =
      tourId === "app-tour-modal" || tourId === "app-tour-fallback-anchor"
        ? 1
        : elementLayoutArea(el);
    if (area > bestArea) {
      bestArea = area;
      best = el;
    }
  }
  return best;
}

export function findFirstVisibleTourElement(selector: string): Element | null {
  return findBestVisibleTourElement(selector);
}

export function isTourFallbackHighlightElement(el: Element | null | undefined): boolean {
  if (!el || !(el instanceof HTMLElement)) return true;
  const tour = el.dataset.tour;
  return tour === "app-tour-modal" || tour === "app-tour-fallback-anchor";
}

export async function waitForTourElement(
  selector: string,
  timeoutMs = 2000
): Promise<Element | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const el = findBestVisibleTourElement(selector);
    if (el) return el;
    await new Promise((r) => window.setTimeout(r, 50));
  }
  return findBestVisibleTourElement(selector);
}

/** Espera o alvo real (não modal/fallback do guia). */
export async function waitForRealTourElement(
  selector: string,
  timeoutMs = 4500
): Promise<Element | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const el = findBestVisibleTourElement(selector);
    if (el && !isTourFallbackHighlightElement(el)) return el;
    await new Promise((r) => window.setTimeout(r, 50));
  }
  const last = findBestVisibleTourElement(selector);
  if (last && !isTourFallbackHighlightElement(last)) return last;
  return null;
}

export async function waitForTourAnchors(tourId: OnboardingTourId): Promise<void> {
  const selector = tourId === "admin" ? ADMIN_READY_SELECTOR : TECHNICIAN_READY_SELECTOR;
  if (tourId !== "admin" && tourId !== "technician") return;

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (findBestVisibleTourElement(selector)) return;
    await new Promise((r) => window.setTimeout(r, 200));
  }
}

export function scrollTourTargetIntoView(element: Element): void {
  if (!(element instanceof HTMLElement)) return;
  const drawerScroll = element.closest('[data-tour-scroll="tech-drawer-body"]');
  if (drawerScroll instanceof HTMLElement) {
    const scrollRect = drawerScroll.getBoundingClientRect();
    const elRect = element.getBoundingClientRect();
    const offset = elRect.top - scrollRect.top - scrollRect.height * 0.22;
    drawerScroll.scrollBy({ top: offset, behavior: "smooth" });
    return;
  }
  const adminScroll = element.closest('[data-tour-scroll="admin-opp-body"]');
  if (adminScroll instanceof HTMLElement) {
    const scrollRect = adminScroll.getBoundingClientRect();
    const elRect = element.getBoundingClientRect();
    const offset = elRect.top - scrollRect.top - scrollRect.height * 0.22;
    adminScroll.scrollBy({ top: offset, behavior: "smooth" });
    return;
  }
  element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

/** Âncora invisível centrada — nunca usar `body` (pinta o ecrã todo de branco). */
function getTourFallbackElement(): Element {
  const modal = findBestVisibleTourElement(TOUR_MODAL_SELECTOR);
  if (modal) return modal;
  const existing = document.querySelector('[data-tour="app-tour-fallback-anchor"]');
  if (existing) return existing;
  const anchor = document.createElement("div");
  anchor.setAttribute("data-tour", "app-tour-fallback-anchor");
  anchor.setAttribute("aria-hidden", "true");
  anchor.className = "pointer-events-none fixed left-1/2 top-1/2 z-[10039] h-px w-px -translate-x-1/2 -translate-y-1/2 opacity-0";
  document.body.appendChild(anchor);
  return anchor;
}

function resolveMissingTourElement(step: {
  fallbackModalIfMissing?: boolean;
  drawerStep?: boolean;
  sheetStep?: boolean;
}): Element {
  if (step.fallbackModalIfMissing || step.drawerStep || step.sheetStep) {
    const modal = findBestVisibleTourElement(TOUR_MODAL_SELECTOR);
    if (modal) return modal;
  }
  return getTourFallbackElement();
}

export function resolveTourStepElement(
  step: {
    element?: string;
    modal?: boolean;
    fallbackModalIfMissing?: boolean;
    drawerStep?: boolean;
    sheetStep?: boolean;
  }
): (() => Element) | undefined {
  if (!step.element) return undefined;

  const target = step.element;
  const isModalAnchor = target === TOUR_MODAL_SELECTOR;

  if (isModalAnchor) {
    return () => findBestVisibleTourElement(TOUR_MODAL_SELECTOR) ?? getTourFallbackElement();
  }

  const resolvePrimaryOrFallback = (): Element => {
    const primary = findBestVisibleTourElement(target);
    if (primary) return primary;
    if (step.fallbackModalIfMissing || step.drawerStep || step.sheetStep) {
      return resolveMissingTourElement(step);
    }
    return getTourFallbackElement();
  };

  if (step.sheetStep || step.drawerStep || step.fallbackModalIfMissing) {
    return resolvePrimaryOrFallback;
  }

  return () => {
    const primary = findBestVisibleTourElement(target);
    if (primary) return primary;
    return getTourFallbackElement();
  };
}
