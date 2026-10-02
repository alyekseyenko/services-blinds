import * as React from "react";
import { cn } from "@/lib/cn";
import { Panel, type PanelProps } from "@/components/ui/Panel";

export interface AppPageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inclui grelha brutalista de fundo (login, técnico, admin, CEO, armazém). */
  grid?: boolean;
}

/** Contentor de página partilhado — tokens brutalistas. */
export function AppPageShell({
  className = "",
  grid = true,
  children,
  ...props
}: AppPageShellProps) {
  return (
    <div
      className={cn(
        "min-h-dvh bg-background font-sans text-foreground",
        grid && "brutal-grid-bg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type BrutalPanelProps = Omit<PanelProps, "variant"> & {
  /** @deprecated Use `variant="ink"` em Panel */
  variant?: "default" | "dark";
};

/** @deprecated Preferir `Panel` */
export function BrutalPanel({ className = "", variant = "default", children, ...props }: BrutalPanelProps) {
  const mapped = variant === "dark" ? "ink" : "default";
  return (
    <Panel className={className} variant={mapped} {...props}>
      {children}
    </Panel>
  );
}

export { Panel };
