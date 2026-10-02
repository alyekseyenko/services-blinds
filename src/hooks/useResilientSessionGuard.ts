import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { probeAuthSession } from "@/lib/auth/confirmSession";

const CONFIRM_DELAY_MS = 4_000;

export type ResilientSessionGuardOptions = {
  /** Return true when the current session may access this route. */
  isAuthorized: (session: Session) => boolean;
  /** Called when session is valid for this route (profile setup, etc.). */
  onAuthorized?: (session: Session) => void;
  /**
   * When next-auth reports unauthenticated, run confirm probe before redirect.
   * Set false for login page.
   */
  redirectWhenUnauthenticated?: boolean;
  /** Skip redirect to login (e.g. technician offline with cached profile). */
  skipRedirectIf?: () => boolean;
};

export function useResilientSessionGuard(options: ResilientSessionGuardOptions) {
  const {
    isAuthorized,
    onAuthorized,
    redirectWhenUnauthenticated = true,
    skipRedirectIf,
  } = options;
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const probingRef = useRef(false);

  useEffect(() => {
    if (status === "loading") return;

    if (session && isAuthorized(session)) {
      setServerUnreachable(false);
      onAuthorized?.(session);
      return;
    }

    if (session && !isAuthorized(session)) {
      router.replace("/");
      return;
    }

    if (!redirectWhenUnauthenticated) return;

    if (status !== "unauthenticated" && !session) {
      return;
    }

    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => {
      if (probingRef.current) return;
      probingRef.current = true;
      void probeAuthSession()
        .then((probe) => {
          if (probe.transientFailure) {
            setServerUnreachable(true);
            return;
          }
          setServerUnreachable(false);
          if (probe.hasUser) {
            void update();
            return;
          }
          if (skipRedirectIf?.()) {
            return;
          }
          router.replace("/");
        })
        .finally(() => {
          probingRef.current = false;
        });
    }, CONFIRM_DELAY_MS);

    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, [session, status, isAuthorized, onAuthorized, redirectWhenUnauthenticated, skipRedirectIf, router, update]);

  useEffect(() => {
    if (!serverUnreachable) return;
    const id = window.setInterval(() => {
      void probeAuthSession().then((probe) => {
        if (!probe.transientFailure && probe.hasUser) {
          setServerUnreachable(false);
        }
      });
    }, 30_000);
    return () => clearInterval(id);
  }, [serverUnreachable]);

  return { session, status, serverUnreachable };
}
