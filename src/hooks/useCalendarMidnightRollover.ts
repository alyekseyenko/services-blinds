import { useEffect } from "react";

/** When the local calendar day changes, invoke callback (e.g. reset agenda date to today). */
export function useCalendarMidnightRollover(onRollover: () => void) {
  useEffect(() => {
    let dayKey = new Date().toDateString();
    const tick = () => {
      const today = new Date().toDateString();
      if (today === dayKey) return;
      dayKey = today;
      onRollover();
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [onRollover]);
}
