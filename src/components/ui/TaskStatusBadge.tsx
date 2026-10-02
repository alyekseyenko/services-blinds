import { formatTaskStatusPt } from "@/lib/taskStatusLabels";
import { StatusChip } from "@/components/ui/StatusChip";

type TaskStatusBadgeProps = {
  status?: string | null;
  className?: string;
};

export function TaskStatusBadge({ status, className = "" }: TaskStatusBadgeProps) {
  const label = formatTaskStatusPt(status);
  return <StatusChip label={label} tone="neutral" className={className} />;
}
