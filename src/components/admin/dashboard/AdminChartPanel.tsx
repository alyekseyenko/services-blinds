"use client";

import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  "data-tour"?: string;
};

export function AdminChartPanel({ title, subtitle, children, className, "data-tour": dataTour }: Props) {
  return (
    <Panel
      variant="outline"
      data-tour={dataTour}
      className={cn("overflow-hidden rounded-2xl p-0 shadow-none", className)}
    >
      <div className="border-b-2 border-border-strong bg-muted px-4 py-3 sm:px-5">
        <h3 className="ds-kicker text-foreground">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="bg-card p-4 sm:p-5">{children}</div>
    </Panel>
  );
}

export type BrutalBarItem = {
  id: string;
  label: string;
  value: number;
  fill: string;
};

export function AdminBrutalBarList({ items }: { items: BrutalBarItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm font-semibold text-muted-foreground">Sem dados.</p>
    );
  }

  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
        return (
          <li key={item.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">
                {item.label}
              </span>
              <span className="ds-num shrink-0 text-lg font-black leading-none text-foreground">
                {item.value}
              </span>
            </div>
            <div
              className="h-5 border-2 border-border-strong bg-muted"
              role="presentation"
              aria-hidden
            >
              <div
                className="h-full border-r-2 border-border-strong transition-[width] duration-300"
                style={{ width: `${pct}%`, backgroundColor: item.fill }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
