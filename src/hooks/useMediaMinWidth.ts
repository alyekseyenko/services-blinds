import { useEffect, useState } from "react";

/** True when viewport is at least `minPx` wide. */
export function useMediaMinWidth(minPx: number): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(`(min-width: ${minPx}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minPx}px)`);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [minPx]);

  return matches;
}
