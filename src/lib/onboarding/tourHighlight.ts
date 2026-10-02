const INSET_RING_SURFACE_TOURS = new Set([
  "admin-workspace",
  "admin-map-canvas",
  "admin-calendar",
  "admin-history",
  "tech-map-canvas",
  "tech-calendar",
  "tech-history",
  "tech-list-agenda",
]);

function usesInsetTourHighlight(el: HTMLElement): boolean {
  const tour = el.dataset.tour;
  if (tour && INSET_RING_SURFACE_TOURS.has(tour)) return true;
  if (tour?.startsWith("admin-calendar")) return true;
  if (tour?.startsWith("admin-route")) return true;
  if (tour?.startsWith("admin-nav-")) return true;
  if (tour?.startsWith("tech-nav-")) return true;
  if (tour?.startsWith("tech-drawer")) return true;
  if (tour === "onboarding-demo-pin") return true;
  return false;
}

/** Evita scroll/refresh em alvos grandes ou dentro do Google Maps (tremer / quadrado branco). */
export function shouldSkipTourScrollAndDriverRefresh(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (usesInsetTourHighlight(element)) return true;
  if (element.closest(".gm-style-iw")) return true;
  if (element.closest('[data-tour="admin-map-canvas"]')) return true;
  if (element.closest('[data-tour="tech-map-canvas"]')) return true;
  const tour = element.dataset.tour;
  if (tour?.startsWith("admin-map-")) return true;
  if (tour?.startsWith("tech-map-")) return true;
  return false;
}
