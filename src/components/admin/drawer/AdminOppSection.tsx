"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

export function AdminOppSection({
  title,
  action,
  children,
  className,
  ...props
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <Panel className={cn("space-y-3 p-4", className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="ds-kicker">{title}</h3>
        {action}
      </div>
      {children}
    </Panel>
  );
}