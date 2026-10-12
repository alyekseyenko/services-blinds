"use client";

import { useEffect, useRef, useState } from "react";

/** Curto véu sólido ao mudar separador (mapa/lista) para evitar flash do painel anterior. */
export function useViewSwitchCover(viewKey: string, durationMs = 140): boolean {
  const [cover, setCover] = useState(false);
  const prevRef = useRef(viewKey);

  useEffect(() => {
    if (viewKey === prevRef.current) return;
    prevRef.current = viewKey;
    setCover(true);
    const timer = window.setTimeout(() => setCover(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [viewKey, durationMs]);

  return cover;
}
