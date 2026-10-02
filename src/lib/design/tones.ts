/** Nomes de classes Tailwind — valores em src/styles/design-system.css */

import type { VisitPhaseId } from "@/lib/agendaVisitLifecycle";

export type DesignTone = "success" | "danger" | "warning" | "info" | "neutral";

export const DS_CHIP_CLASS: Record<DesignTone, string> = {
  success: "ds-chip ds-chip-success",
  danger: "ds-chip ds-chip-danger",
  warning: "ds-chip ds-chip-warning",
  info: "ds-chip ds-chip-info",
  neutral: "ds-chip ds-chip-neutral",
};

export const DS_ACCENT_CLASS: Record<DesignTone, string> = {
  success: "ds-accent-success",
  danger: "ds-accent-danger",
  warning: "ds-accent-warning",
  info: "ds-accent-info",
  neutral: "ds-accent-neutral",
};

export const DS_TOAST_CLASS: Record<DesignTone, string> = {
  success: "ds-toast ds-toast-success",
  danger: "ds-toast ds-toast-danger",
  warning: "ds-toast ds-toast-warning",
  info: "ds-toast ds-toast-info",
  neutral: "ds-toast ds-toast-info",
};

export type ToastType = "success" | "error" | "info" | "warning";

export function visitPhaseToTone(phase: VisitPhaseId): DesignTone {
  switch (phase) {
    case "concluida":
    case "armazem":
      return "success";
    case "cancelada":
      return "danger";
    case "incompleta":
    case "atrasada":
    case "saiu":
      return "warning";
    case "em_curso":
      return "info";
    default:
      return "neutral";
  }
}

export function toastTypeToTone(type: ToastType): DesignTone {
  switch (type) {
    case "success":
      return "success";
    case "error":
      return "danger";
    case "warning":
      return "warning";
    case "info":
      return "info";
  }
}
