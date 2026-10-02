import * as React from "react";
import { cn } from "@/lib/cn";
import { Marquee } from "@/components/ui/Marquee";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  marquee?: string;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  marquee,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-strong bg-muted/40 px-6 py-10 text-center",
        className
      )}
    >
      {icon ? <div className="mb-4 text-muted-foreground">{icon}</div> : null}
      <h3 className="ds-title text-display-sm tracking-tight text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm font-semibold text-muted-foreground">{description}</p>
      ) : null}
      {marquee ? (
        <div className="mt-6 w-full max-w-lg">
          <Marquee segments={[marquee]} />
        </div>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
