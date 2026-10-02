import * as React from "react";
import { cn } from "@/lib/cn";

export interface TicketCardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

/** Cartão tipo bilhete com divisória perfurada. */
export function TicketCard({ className, header, footer, children, ...props }: TicketCardProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border-2 border-border-strong bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    >
      {header ? <header className="border-b border-border px-4 py-3 sm:px-5">{header}</header> : null}
      <div className="ticket-divider" aria-hidden />
      <div className="px-4 py-4 sm:px-5">{children}</div>
      {footer ? (
        <>
          <div className="ticket-divider" aria-hidden />
          <footer className="border-t border-border bg-muted/50 px-4 py-3 sm:px-5">{footer}</footer>
        </>
      ) : null}
    </article>
  );
}
