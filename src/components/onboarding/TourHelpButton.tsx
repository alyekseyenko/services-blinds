"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { HelpCircle, BookOpen, ChevronRight } from "lucide-react";
import {
  getAutostartChapterId,
  getChaptersForTour,
  listChaptersForRole,
  tourHasChapterPicker,
  ONBOARDING_ESSENTIALS_CHAPTER_ID,
} from "@/lib/onboarding/tours";
import {
  dispatchOnboardingRestart,
  type OnboardingRestartDetail,
} from "@/lib/onboarding/events";
import { requestTourChapterPicker } from "@/lib/onboarding/requestTourChapterPicker";
import {
  getHomePathForTourId,
  getTourIdForSession,
} from "@/lib/onboarding/roleTour";
import type { TourChapter, TourChapterId } from "@/lib/onboarding/chapters/types";
import type { AppRole } from "@/lib/schemas/auth";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";

type TourChapterPickerProps = {
  open: boolean;
  onClose: () => void;
};

function ChapterSection({
  heading,
  chapters,
  onPick,
}: {
  heading: string;
  chapters: TourChapter[];
  onPick: (id: TourChapterId) => void;
}) {
  if (chapters.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {heading}
      </h3>
      <ul className="flex flex-col gap-2">
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <button
              type="button"
              onClick={() => onPick(chapter.id)}
              className="flex w-full min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted active:scale-[0.99]"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary-ink"
                aria-hidden
              >
                <BookOpen className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{chapter.title}</span>
                  {chapter.id === ONBOARDING_ESSENTIALS_CHAPTER_ID ? (
                    <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-ink">
                      Início
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 line-clamp-2 text-xs font-medium text-muted-foreground">
                  {chapter.description}
                </span>
                <span className="mt-1 block text-[10px] font-semibold text-muted-foreground">
                  {chapter.steps.length} passo{chapter.steps.length === 1 ? "" : "s"}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TourChapterPicker({ open, onClose }: TourChapterPickerProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const tourId = getTourIdForSession(role, pathname ?? "");

  const chapters =
    tourId && pathname === getHomePathForTourId(tourId)
      ? listChaptersForRole(tourId, role)
      : [];

  const { essentials, deepDive } = useMemo(() => {
    const essential = chapters.filter((c) => c.id === ONBOARDING_ESSENTIALS_CHAPTER_ID);
    const rest = chapters.filter((c) => c.id !== ONBOARDING_ESSENTIALS_CHAPTER_ID);
    return { essentials: essential, deepDive: rest };
  }, [chapters]);

  const startChapter = useCallback(
    (chapterId: TourChapterId) => {
      if (!tourId) return;
      const detail: OnboardingRestartDetail = { chapterId, tourId };
      onClose();
      window.setTimeout(() => {
        dispatchOnboardingRestart(detail);
      }, 120);
    },
    [onClose, tourId]
  );

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0, left: 0 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const showPicker = open && Boolean(tourId);

  if (!tourId) return null;

  return (
    <Sheet
      open={showPicker}
      onClose={onClose}
      title="Guias da app"
      description="Visitas guiadas por área — pode sair a qualquer momento."
      side="bottom"
      priority="elevated"
      flexBody
      fullScreen
    >
      {chapters.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted-foreground">A carregar capítulos…</p>
      ) : (
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pb-6 pt-2"
        >
          <ChapterSection
            heading="Começar aqui"
            chapters={essentials}
            onPick={startChapter}
          />
          <ChapterSection
            heading="Explorar por tema"
            chapters={deepDive}
            onPick={startChapter}
          />
        </div>
      )}
    </Sheet>
  );
}

type TourHelpButtonProps = {
  className?: string;
  label?: string;
};

export default function TourHelpButton({
  className = "",
  label = "Rever visita guiada",
}: TourHelpButtonProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const tourId = getTourIdForSession(role, pathname ?? "");
  const homePath = tourId ? getHomePathForTourId(tourId) : null;
  const onHome = Boolean(homePath && pathname === homePath);
  const hasPicker = tourId ? tourHasChapterPicker(tourId) : false;

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onHome || !tourId) return;
    if (hasPicker) {
      requestTourChapterPicker();
      return;
    }
    const chapterId = getAutostartChapterId(tourId);
    dispatchOnboardingRestart({ chapterId, tourId });
  };

  return (
    <button
      type="button"
      data-tour="tour-help-button"
      onClick={handleClick}
      className={cn(
        "flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-all hover:bg-muted active:scale-95",
        className
      )}
      aria-label={label}
      title={label}
      data-tour-help
    >
      <HelpCircle className="h-5 w-5" aria-hidden />
    </button>
  );
}

/** Capítulos disponíveis no ecrã actual (para testes). */
export function getVisibleTourChapters(role: AppRole | undefined, pathname: string) {
  const tourId = getTourIdForSession(role, pathname);
  if (!tourId || pathname !== getHomePathForTourId(tourId)) return [];
  return listChaptersForRole(tourId, role);
}

export { getChaptersForTour };
