"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Volume2, VolumeX, Vibrate, Smartphone } from "lucide-react";
import {
  FEEDBACK_PREFS_CHANGED_EVENT,
  isFeedbackSoundEnabled,
  isFeedbackVibrationEnabled,
  setFeedbackSoundEnabled,
  setFeedbackVibrationEnabled,
} from "@/lib/feedbackCue";
import { useClientHydrated } from "@/hooks/useClientHydrated";
import { cn } from "@/lib/cn";

type FeedbackCuePreferencesProps = {
  layout: "sheet-rows" | "admin-rows";
};

function TogglePill({
  enabled,
  onToggle,
  labelOn,
  labelOff,
}: {
  enabled: boolean;
  onToggle: () => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-8 min-w-[3.25rem] shrink-0 items-center rounded-full border-2 border-border px-0.5 transition-colors",
        enabled ? "bg-primary/20 border-border-strong" : "bg-muted"
      )}
      aria-label={enabled ? labelOn : labelOff}
    >
      <span
        className={cn(
          "block h-6 w-6 rounded-full border border-border bg-card shadow-sm transition-transform",
          enabled ? "translate-x-[1.35rem]" : "translate-x-0"
        )}
        aria-hidden
      />
    </button>
  );
}

function useFeedbackPrefs() {
  const hydrated = useClientHydrated();
  const [soundOn, setSoundOn] = useState(true);
  const [vibrationOn, setVibrationOn] = useState(true);

  const refresh = useCallback(() => {
    setSoundOn(isFeedbackSoundEnabled());
    setVibrationOn(isFeedbackVibrationEnabled());
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(FEEDBACK_PREFS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(FEEDBACK_PREFS_CHANGED_EVENT, onChange);
  }, [refresh]);

  return { hydrated, soundOn, vibrationOn, setSoundOn, setVibrationOn };
}

function PrefRow({
  icon,
  title,
  detail,
  enabled,
  onToggle,
  labelOn,
  labelOff,
  className,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  enabled: boolean;
  onToggle: () => void;
  labelOn: string;
  labelOff: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3",
        className
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="text-xs font-medium text-muted-foreground">{detail}</span>
      </span>
      <TogglePill enabled={enabled} onToggle={onToggle} labelOn={labelOn} labelOff={labelOff} />
    </div>
  );
}

export function FeedbackCuePreferences({ layout }: FeedbackCuePreferencesProps) {
  const { hydrated, soundOn, vibrationOn, setSoundOn, setVibrationOn } = useFeedbackPrefs();

  const toggleSound = () => {
    const next = !soundOn;
    setFeedbackSoundEnabled(next);
    setSoundOn(next);
  };

  const toggleVibration = () => {
    const next = !vibrationOn;
    setFeedbackVibrationEnabled(next);
    setVibrationOn(next);
  };

  const soundDetail = !hydrated ? "\u00a0" : soundOn ? "Ligado" : "Desligado";
  const vibrationDetail = !hydrated ? "\u00a0" : vibrationOn ? "Ligado" : "Desligado";

  const soundRow = (
    <PrefRow
      icon={soundOn ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
      title="Som"
      detail={soundDetail}
      enabled={soundOn}
      onToggle={toggleSound}
      labelOn="Desligar som"
      labelOff="Ligar som"
    />
  );

  const vibrationRow = (
    <PrefRow
      icon={
        vibrationOn ? (
          <Vibrate className="h-5 w-5" aria-hidden />
        ) : (
          <Smartphone className="h-5 w-5 opacity-60" aria-hidden />
        )
      }
      title="Vibração"
      detail={vibrationDetail}
      enabled={vibrationOn}
      onToggle={toggleVibration}
      labelOn="Desligar vibração"
      labelOff="Ligar vibração"
    />
  );

  if (layout === "sheet-rows") {
    return (
      <>
        <li>{soundRow}</li>
        <li>{vibrationRow}</li>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {soundRow}
      {vibrationRow}
    </div>
  );
}
