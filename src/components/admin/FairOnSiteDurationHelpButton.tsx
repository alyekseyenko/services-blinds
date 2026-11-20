"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { FAIR_ON_SITE_DURATION_HELP_PT } from "@/lib/visitOnSiteDurationStats";
import { cn } from "@/lib/cn";

export function FairOnSiteDurationHelpButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Como é calculado o tempo médio"
        className={cn(
          compact
            ? "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            : "inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground hover:border-primary hover:text-foreground",
          className
        )}
      >
        <HelpCircle className={compact ? "h-3 w-3" : "h-4 w-4"} aria-hidden />
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tempo médio justo"
        description="Referência por tipo de serviço na equipa"
      >
        <p className="text-sm font-medium leading-relaxed text-muted-foreground">
          {FAIR_ON_SITE_DURATION_HELP_PT}
        </p>
      </Dialog>
    </>
  );
}
