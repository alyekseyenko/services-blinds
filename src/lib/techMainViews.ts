export const TECH_MAIN_VIEWS = ["map", "list", "calendar", "history"] as const;

export type TechMainView = (typeof TECH_MAIN_VIEWS)[number];

export const TECH_MAIN_VIEW_LABELS: Record<TechMainView, string> = {
  map: "Mapa",
  list: "Lista",
  calendar: "Calendário",
  history: "Histórico",
};

export function adjacentTechMainView(current: string, delta: number): TechMainView | null {
  const idx = TECH_MAIN_VIEWS.indexOf(current as TechMainView);
  if (idx < 0) return null;
  const next = TECH_MAIN_VIEWS[idx + delta];
  return next ?? null;
}

export function techMainViewLabel(viewId: string): string {
  return TECH_MAIN_VIEW_LABELS[viewId as TechMainView] ?? viewId;
}
