import * as React from "react";
import { ArrowDownRight, Asterisk } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DisplayHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3";
  seal?: "arrow" | "asterisk" | "none";
  lines?: string[];
}

export function DisplayHeading({
  className = "",
  as = "h2",
  seal = "none",
  lines,
  children,
  ...props
}: DisplayHeadingProps) {
  const Tag = as;

  const sealNode =
    seal === "arrow" ? (
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-neon text-neon-foreground"
        aria-hidden
      >
        <ArrowDownRight className="h-5 w-5" strokeWidth={2.5} />
      </span>
    ) : seal === "asterisk" ? (
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-ink text-ink-foreground"
        aria-hidden
      >
        <Asterisk className="h-5 w-5" strokeWidth={2.5} />
      </span>
    ) : null;

  const body =
    lines && lines.length > 0 ? (
      <span className="flex flex-col gap-0.5 leading-[0.95]">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
    ) : (
      children
    );

  return (
    <Tag
      className={cn(
        "ds-title text-2xl tracking-tight text-foreground md:text-3xl",
        className
      )}
      {...props}
    >
      <span className="flex flex-wrap items-center gap-3">
        {body}
        {sealNode}
      </span>
    </Tag>
  );
}
