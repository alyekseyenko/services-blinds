"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyTextToClipboard } from "@/lib/ui/clipboardCopy";
import { cn } from "@/lib/cn";

export function CopyTextButton({
  text,
  label,
  className,
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyTextToClipboard(text);
        if (!ok) return;
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
      className={cn(
        "inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary-ink",
        className
      )}
      aria-label={label}
      title={label}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success-solid" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}