"use client";

import { useCallback, useMemo, useState } from "react";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import {
  addCalendarDaysYmd,
  resolveHistoryDateRange,
  toLisbonYmd,
  type HistoryDatePreset,
  type HistoryDateRange,
} from "@/lib/visits/historyFilters";

export function useHistoryListFilters() {
  const [datePreset, setDatePreset] = useState<HistoryDatePreset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [outcomes, setOutcomes] = useState<MapHistoryOutcome[]>([]);

  const range: HistoryDateRange = useMemo(
    () => resolveHistoryDateRange(datePreset, from, to),
    [datePreset, from, to]
  );

  const setPreset = useCallback((preset: HistoryDatePreset) => {
    setDatePreset(preset);
    const today = toLisbonYmd(new Date()) ?? "";
    if (preset !== "from" && preset !== "between") {
      setFrom("");
      setTo("");
      return;
    }
    if (preset === "from") {
      setFrom((current) => current || today);
      setTo("");
      return;
    }
    setFrom((current) => current || addCalendarDaysYmd(today, -6));
    setTo((current) => current || today);
  }, []);

  const toggleOutcome = useCallback((outcome: MapHistoryOutcome) => {
    setOutcomes((prev) =>
      prev.includes(outcome) ? prev.filter((item) => item !== outcome) : [...prev, outcome]
    );
  }, []);

  const clear = useCallback(() => {
    setDatePreset("all");
    setFrom("");
    setTo("");
    setOutcomes([]);
  }, []);

  const isFiltered = datePreset !== "all" || outcomes.length > 0 || Boolean(from) || Boolean(to);

  return {
    datePreset,
    setPreset,
    from,
    setFrom,
    to,
    setTo,
    outcomes,
    toggleOutcome,
    clear,
    range,
    isFiltered,
  };
}
