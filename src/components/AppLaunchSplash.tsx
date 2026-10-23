"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { APP_LOGO_PATH, APP_SHORT_NAME } from "@/lib/branding";

const LAUNCH_SPLASH_SESSION_KEY = "launch_splash_shown";
const MIN_VISIBLE_MS = 700;
const MAX_VISIBLE_MS = 1200;
const FADE_MS = 300;

type Phase = "visible" | "hiding" | "hidden";

export default function AppLaunchSplash() {
  const { status } = useSession();
  const statusRef = useRef(status);
  statusRef.current = status;

  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    if (sessionStorage.getItem(LAUNCH_SPLASH_SESSION_KEY) === "1") return;

    setPhase("visible");
    const startedAt = Date.now();
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      setPhase("hiding");
      hideTimer = setTimeout(() => {
        sessionStorage.setItem(LAUNCH_SPLASH_SESSION_KEY, "1");
        setPhase("hidden");
      }, FADE_MS);
    };

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const sessionReady = statusRef.current !== "loading";
      if (elapsed >= MAX_VISIBLE_MS || (sessionReady && elapsed >= MIN_VISIBLE_MS)) {
        clearInterval(interval);
        finish();
      }
    }, 50);

    return () => {
      clearInterval(interval);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`login-page-grid fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        phase === "hiding" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-busy={phase === "visible"}
      aria-label="A carregar"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-border-strong bg-ink shadow-sm">
          <Image
            src={APP_LOGO_PATH}
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 object-contain"
            priority
          />
        </div>
        <p className="ds-title text-sm font-normal tracking-[0.2em] text-foreground uppercase">
          {APP_SHORT_NAME}
        </p>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">
          Medir · Instalar · Sincronizar
        </p>
      </div>
    </div>
  );
}
