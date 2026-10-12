"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ROUTE_TRANSITION_BEGIN_EVENT } from "@/lib/navigation/routeTransition";

const MAX_PENDING_MS = 12_000;

function isInternalAppNavigation(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  const next = `${url.pathname}${url.search}`;
  const current = `${window.location.pathname}${window.location.search}`;
  return next !== current;
}

export default function RouteNavigationOverlay() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathnameRef = useRef(pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPending(false);
  };

  const armPending = () => {
    setPending(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(clearPending, MAX_PENDING_MS);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalAppNavigation(anchor)) return;
      armPending();
    };

    const onProgrammatic = () => armPending();

    document.addEventListener("click", onLinkClick, true);
    window.addEventListener(ROUTE_TRANSITION_BEGIN_EVENT, onProgrammatic);
    return () => {
      document.removeEventListener("click", onLinkClick, true);
      window.removeEventListener(ROUTE_TRANSITION_BEGIN_EVENT, onProgrammatic);
    };
  }, []);

  useEffect(() => {
    if (pathname === pathnameRef.current) return;
    pathnameRef.current = pathname;
    const end = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => clearPending());
      });
    };
    end();
  }, [pathname]);

  if (!mounted || !pending) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10060] flex flex-col items-center justify-center gap-3 bg-background/95 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="A carregar página"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
        A carregar…
      </p>
    </div>,
    document.body
  );
}
