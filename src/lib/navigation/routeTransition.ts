/** Sinaliza início de navegação entre rotas (overlay cobre o ecrã antigo). */

export const ROUTE_TRANSITION_BEGIN_EVENT = "app:route-transition-begin";

export function signalRouteTransitionStart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ROUTE_TRANSITION_BEGIN_EVENT));
}
