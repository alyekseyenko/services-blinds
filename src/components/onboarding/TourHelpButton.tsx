"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { HelpCircle, BookOpen } from "lucide-react";
import {
  getAutostartChapterId,
  getChaptersForTour,
  listChaptersForRole,
  tourHasChapterPicker,
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
import type { TourChapterId } from "@/lib/onboarding/chapters/types";
import type { AppRole } from "@/lib/schemas/auth";
import { Sheet } from "@/components/ui/Sheet";

type TourChapterPickerProps = {
  open: boolean;
  onClose: () => void;
};

export function TourChapterPicker({ open, onClose }: TourChapterPickerProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: AppRole } | undefined)?.role;
  const tourId = getTourIdForSession(role, pathname ?? "");

  const chapters =
    tourId && pathname === getHomePathForTourId(tourId)
      ? listChaptersForRole(tourId, role)
      : [];

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
      side="bottom"
      priority="elevated"
      flexBody
    >
      {chapters.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-muted-foreground">A carregar capítulos…</p>
      ) : (
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          <p className="mb-4 text-xs text-muted-foreground">
            Escolha um capítulo. «Primeiros passos» é o guia inicial; os restantes aprofundam uma área.
          </p>
          <ul className="flex flex-col gap-2">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  onClick={() => startChapter(chapter.id)}
                  className="flex w-full min-h-12 flex-col items-start gap-0.5 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-foreground">
                    <BookOpen className="h-4 w-4 shrink-0 text-primary-ink" aria-hidden />
                    {chapter.title}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{chapter.description}</span>
                </button>
              </li>
            ))}
          </ul>
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
      className={`flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-all hover:bg-muted active:scale-95 ${className}`}
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
