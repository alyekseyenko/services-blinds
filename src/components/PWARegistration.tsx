"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function postCacheShell(registration: ServiceWorkerRegistration | null | undefined) {
  const worker = registration?.active || registration?.waiting || registration?.installing;
  worker?.postMessage({ type: "CACHE_SHELL" });
}

export default function PWARegistration() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    void (async () => {
      let buildId = "dev";
      try {
        const res = await fetch("/api/app-version", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { buildId?: string };
          if (data.buildId) buildId = data.buildId;
        }
      } catch {
        /* offline dev */
      }

      if ("storage" in navigator && navigator.storage?.persist) {
        void navigator.storage.persist().catch(() => {});
      }

      try {
        const registration = await navigator.serviceWorker.register(
          `/sw.js?v=${encodeURIComponent(buildId)}`
        );
        if (cancelled) return;
        if (pathname?.startsWith("/dashboard")) {
          postCacheShell(registration);
          navigator.serviceWorker.ready.then((ready) => postCacheShell(ready)).catch(() => {});
        }
      } catch {
        /* registration optional in dev */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!pathname?.startsWith("/dashboard")) return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((ready) => postCacheShell(ready)).catch(() => {});
  }, [pathname]);

  return null;
}
