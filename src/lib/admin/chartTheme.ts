/** Cores de gráficos — tokens semânticos (design-system.css). */
export const ADMIN_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export const ADMIN_CHART_GRID = "var(--border)";
export const ADMIN_CHART_AXIS = "var(--muted-foreground)";
export const ADMIN_CHART_STROKE = "var(--border-strong)";
export const ADMIN_CHART_PRIMARY = "var(--primary)";
export const ADMIN_CHART_TOOLTIP_BG = "var(--card)";
export const ADMIN_CHART_TOOLTIP_BORDER = "var(--border-strong)";

export const PIPELINE_CHART_COLORS: Record<string, string> = {
  toSchedule: "var(--tone-warning-solid)",
  scheduled: "var(--primary)",
  inProgress: "var(--tone-info-solid)",
  incomplete: "var(--tone-danger-solid)",
  pending: "var(--tone-neutral-solid)",
};
