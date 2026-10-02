import { useEffect, useState } from "react";

/** Evita mismatch de hidratação em textos com `toLocale*` (servidor ≠ cliente). */
export function useClientHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
