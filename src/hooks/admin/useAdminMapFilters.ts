"use client";

import { useCallback, useMemo, useState } from "react";
import { useSync } from "@/hooks/useSync";
import { normalizeOpportunityList } from "@/lib/admin/opportunityNormalizers";
import {
  buildMapTechnicianOptions,
  extractTechnicianNames,
  filterCalendarOpportunities,
  filterMapOpportunities,
} from "@/lib/admin/opportunityFilters";
import { searchOpportunities } from "@/lib/admin/opportunitySearch";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import type { AdminHomeMapFilterAction } from "@/lib/admin/adminHomeMapFilter";
import { countOpportunitiesPendingTechnicianClosure } from "@/lib/visitPendingClosure";
import type { MapCategoryFilter, MapStallFilter, Opportunity } from "@/types/admin";
import type { TechnicianLocation } from "@/hooks/useTechnicianLocations";

export function useAdminMapFilters(params: {
  opportunities: Opportunity[];
  techniciansLocations: TechnicianLocation[];
  changeAdminView: (view: string) => void;
}) {
  const { opportunities, techniciansLocations, changeAdminView } = params;

  const [mapTab, setMapTab] = useState("unscheduled");
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [serviceTypeFilters, setServiceTypeFilters] = useState<MapCategoryFilter[]>([]);
  const [mapTechnicianFilter, setMapTechnicianFilter] = useState<string | null>(null);
  const [historyOutcomes, setHistoryOutcomes] = useState<MapHistoryOutcome[]>([]);
  const [stallFilter, setStallFilter] = useState<MapStallFilter>("all");
  const [pendingClosureOnly, setPendingClosureOnly] = useState(false);
  const [mapTextSearch, setMapTextSearch] = useState<string | null>(null);
  const [mapFocusOpportunityId, setMapFocusOpportunityId] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState("all");

  const historyMapFetchEnabled = historyOutcomes.length > 0;
  const { data: mapHistoryPage, refreshNow: refreshMapHistory } = useSync<{ items: Opportunity[] }>(
    historyMapFetchEnabled
      ? `/api/opportunities/history?page=1&pageSize=100&withCoordinates=1&outcomes=${historyOutcomes.join(",")}`
      : null
  );
  const mapHistoryItems = useMemo(
    () => normalizeOpportunityList(mapHistoryPage?.items ?? []),
    [mapHistoryPage]
  );

  const technicians = useMemo(() => extractTechnicianNames(opportunities), [opportunities]);

  const mapTechnicianOptions = useMemo(
    () => buildMapTechnicianOptions(opportunities, techniciansLocations),
    [opportunities, techniciansLocations]
  );

  const toggleServiceTypeFilter = (key: MapCategoryFilter) => {
    if (key === "all") {
      setServiceTypeFilters([]);
      return;
    }
    setServiceTypeFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleHistoryOutcome = (outcome: MapHistoryOutcome) => {
    setHistoryOutcomes((prev) =>
      prev.includes(outcome) ? prev.filter((o) => o !== outcome) : [...prev, outcome]
    );
  };

  const mapOpportunities = useMemo(() => {
    const q = mapTextSearch?.trim();
    if (q) return searchOpportunities(opportunities, q, 50);
    return filterMapOpportunities(opportunities, {
      mapTab,
      cityFilter,
      serviceTypeFilters,
      stallFilter,
      technicianFilter: mapTechnicianFilter,
      historyOutcomes,
      historyItems: mapHistoryItems,
      pendingClosureOnly,
    });
  }, [
    opportunities,
    mapTab,
    cityFilter,
    serviceTypeFilters,
    stallFilter,
    mapTechnicianFilter,
    historyOutcomes,
    mapHistoryItems,
    mapTextSearch,
    pendingClosureOnly,
  ]);

  const pendingClosureCount = useMemo(
    () => countOpportunitiesPendingTechnicianClosure(opportunities),
    [opportunities]
  );

  const openPendingClosureOnMap = useCallback(() => {
    changeAdminView("map");
    setMapTab("scheduled");
    setPendingClosureOnly(true);
    setStallFilter("all");
  }, [changeAdminView]);

  const openMapWithHomeFilter = useCallback(
    (action: AdminHomeMapFilterAction) => {
      changeAdminView("map");
      setPendingClosureOnly(false);
      switch (action) {
        case "overdueToday":
          setMapTab("scheduled");
          setStallFilter("all");
          break;
        case "withoutGps":
          setMapTab("unscheduled");
          setStallFilter("all");
          break;
        case "idle14":
          setMapTab("unscheduled");
          setStallFilter("idle14");
          break;
        case "idle30":
          setMapTab("unscheduled");
          setStallFilter("idle30");
          break;
        default:
          setStallFilter("all");
      }
    },
    [changeAdminView]
  );

  const calendarOpportunities = useMemo(
    () => filterCalendarOpportunities(opportunities, selectedTechnician),
    [opportunities, selectedTechnician]
  );

  return {
    mapTab,
    setMapTab,
    cityFilter,
    setCityFilter,
    serviceTypeFilters,
    setServiceTypeFilters,
    mapTechnicianFilter,
    setMapTechnicianFilter,
    historyOutcomes,
    setHistoryOutcomes,
    stallFilter,
    setStallFilter,
    pendingClosureOnly,
    setPendingClosureOnly,
    mapTextSearch,
    setMapTextSearch,
    mapFocusOpportunityId,
    setMapFocusOpportunityId,
    selectedTechnician,
    setSelectedTechnician,
    technicians,
    mapTechnicianOptions,
    toggleServiceTypeFilter,
    toggleHistoryOutcome,
    mapOpportunities,
    pendingClosureCount,
    openPendingClosureOnMap,
    openMapWithHomeFilter,
    calendarOpportunities,
    mapHistoryItems,
    refreshHistory: refreshMapHistory,
  };
}