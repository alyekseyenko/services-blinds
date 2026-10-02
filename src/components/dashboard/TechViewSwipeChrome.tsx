"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EdgeViewSwipeHint } from "@/hooks/useSwipeEdgeViewChange";
import { TECH_MAIN_VIEWS, techMainViewLabel } from "@/lib/techMainViews";

interface TechViewSwipeChromeProps {
  currentView: string;
  hint: EdgeViewSwipeHint;
  showEdgeAffordances?: boolean;
}

export function TechViewSwipeChrome({
  currentView,
  hint,
  showEdgeAffordances = true,
}: TechViewSwipeChromeProps) {
  const idx = TECH_MAIN_VIEWS.indexOf(currentView as (typeof TECH_MAIN_VIEWS)[number]);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < TECH_MAIN_VIEWS.length - 1;
  const prevLabel = canPrev ? techMainViewLabel(TECH_MAIN_VIEWS[idx - 1]) : null;
  const nextLabel = canNext ? techMainViewLabel(TECH_MAIN_VIEWS[idx + 1]) : null;

  const dragging = hint.phase === "dragging";
  const progress = dragging ? Math.min(hint.progress, 1) : 0;
  const shiftPx =
    dragging && hint.direction === "next"
      ? -progress * 14
      : dragging && hint.direction === "prev"
        ? progress * 14
        : 0;

  return (
    <>
      {showEdgeAffordances && !dragging && (
        <>
          {canPrev && (
            <div
              className="pointer-events-none absolute inset-y-8 left-0 z-[15] flex w-7 items-center justify-center md:hidden"
              aria-hidden
            >
              <div className="flex h-16 w-full items-center justify-start bg-gradient-to-r from-black/10 to-transparent pl-0.5 dark:from-white/10">
                <ChevronLeft className="h-5 w-5 text-muted-foreground/50 dark:text-muted-foreground/40" />
              </div>
            </div>
          )}
          {canNext && (
            <div
              className="pointer-events-none absolute inset-y-8 right-0 z-[15] flex w-7 items-center justify-center md:hidden"
              aria-hidden
            >
              <div className="flex h-16 w-full items-center justify-end bg-gradient-to-l from-black/10 to-transparent pr-0.5 dark:from-white/10">
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 dark:text-muted-foreground/40" />
              </div>
            </div>
          )}
        </>
      )}

      {dragging && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 z-[25] flex justify-center px-4 md:bottom-4"
          style={{ transform: `translateX(${shiftPx}px)` }}
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              "flex min-w-[11rem] max-w-[min(100%,16rem)] flex-col gap-1.5 rounded-xl border-2 border-neon bg-ink px-4 py-2.5 text-ink-foreground transition-transform duration-75",
              progress >= 1 && "scale-[1.02] border-neon"
            )}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-neon">
              {hint.direction === "prev" ? (
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              ) : null}
              <span className="truncate">
                {progress >= 1 ? `Soltar — ${hint.targetLabel}` : hint.targetLabel}
              </span>
              {hint.direction === "next" ? (
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              ) : null}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-card/15">
              <div
                className="h-full rounded-full bg-neon transition-[width] duration-75 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
