import { resolveTaskOverdue } from "@/lib/taskUtils";
import { isNeedsSchedulingStage } from "@/lib/crm/contract";
import { mapPinAlertColor } from "@/lib/map/pinAlert";
import { buildMapMarkerHoverTitle } from "@/lib/map/mapMarkerTitle";

const technicianColors = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

export function getTechnicianColor(technicianName: string | null): string {
  if (!technicianName) return technicianColors[0];
  const hash = technicianName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return technicianColors[hash % technicianColors.length];
}

export type TaskMarkerDescriptor = {
  isLate: boolean;
  isUnscheduled: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  alertColor: string | null;
  techColor: string;
  markerTitle: string;
};

export function buildTaskMarkerDescriptor(
  task: {
    id?: string;
    title?: string | null;
    stage?: string;
    hasScheduledTask?: boolean;
    scheduledAt?: string;
    dueDate?: string | Date;
    status?: string;
    delayAlert?: "red" | "orange" | null;
    technician?: string;
    technicianColor?: string;
  },
  options: {
    highlightedIds: string[];
    selectedMarker?: { id?: string; twentyId?: string } | null;
    showTechnicianColors: boolean;
  }
): TaskMarkerDescriptor {
  const isHighlighted = Boolean(task.id && options.highlightedIds.includes(task.id));
  const isSelected = Boolean(
    options.selectedMarker &&
      (options.selectedMarker.id === task.id ||
        (options.selectedMarker.twentyId &&
          options.selectedMarker.twentyId === (task as { twentyId?: string }).twentyId))
  );
  const isLate = resolveTaskOverdue(task);
  const isUnscheduled = isNeedsSchedulingStage(task.stage) && !task.hasScheduledTask;
  const techColor =
    task.technicianColor ||
    getTechnicianColor(
      task.technician || (task.stage === "Entrada" ? "Unscheduled" : null) || null
    );
  const alertColor = mapPinAlertColor({
    isLate,
    delayAlert: task.delayAlert,
    scheduledAt: task.scheduledAt,
  });
  const markerTitle = buildMapMarkerHoverTitle({
    title: task.title ?? "",
    stage: task.stage,
    hasScheduledTask: task.hasScheduledTask,
    scheduledAt: task.scheduledAt,
    dueDate: task.dueDate,
    isLate,
    status: task.status,
  });

  return {
    isLate,
    isUnscheduled,
    isHighlighted,
    isSelected,
    alertColor,
    techColor,
    markerTitle,
  };
}