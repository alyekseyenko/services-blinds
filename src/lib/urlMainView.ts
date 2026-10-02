const VIEW_PARAM = "view";

export function readMainViewFromUrl(allowed: readonly string[], fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = new URLSearchParams(window.location.search).get(VIEW_PARAM);
  if (value && allowed.includes(value)) return value;
  return fallback;
}

export function writeMainViewToUrl(view: string, replace = false) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.searchParams.get(VIEW_PARAM) === view) return;
  url.searchParams.set(VIEW_PARAM, view);
  const state = { __fieldopsView: view };
  if (replace) {
    window.history.replaceState(state, "", url);
  } else {
    window.history.pushState(state, "", url);
  }
}

type MainViewHistoryState = {
  __fieldopsView?: string;
  __fieldopsOverlay?: string;
};

export function listenMainViewPop(handler: (view: string | null) => void) {
  if (typeof window === "undefined") return () => {};
  const onPop = (event: PopStateEvent) => {
    const state = event.state as MainViewHistoryState | null;
    if (!state?.__fieldopsView) return;
    handler(state.__fieldopsView);
  };
  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}
