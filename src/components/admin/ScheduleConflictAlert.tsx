"use client";

import { AlertCircle } from "lucide-react";
import type { ScheduleConflict } from "@/lib/admin/routeScheduleSlots";
import { formatScheduleConflictPt } from "@/lib/admin/routeScheduleSlots";
import { cn } from "@/lib/cn";

export function ScheduleConflictAlert({
  conflicts,
  className,
}: {
  conflicts: ScheduleConflict[];
  className?: string;
}) {
  if (conflicts.length === 0) return null;
  return (
    <div className={cn("rounded-xl border border-warning bg-warning/10 p-3", className)}>
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <ul className="space-y-1 text-xs text-foreground">
          {conflicts.map((conflict, index) => (
            <li key={`${conflict.memberId}-${conflict.conflictingTitle}-${index}`}>
              {formatScheduleConflictPt(conflict)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}