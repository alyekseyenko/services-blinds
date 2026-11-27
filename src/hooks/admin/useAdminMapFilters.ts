"use client";

import { useCallback, useMemo, useState } from "react";
import { useSync } from "@/hooks/useSync";
import { normalizeOpportunityList } from "@/lib/admin/opportunityNormalizers";
import {
  buildAdminTechnicianRoster,
  buildMapTechnicianOptions,
  filterCalendarOpportunities,
  filterMapOpportunities,
} from "@/lib/admin/opportunityFilters";
import { searchOpportunities } from "@/lib/admin/opportunitySearch";
import type { MapHistoryOutcome } from "@/lib/admin/mapHistoryStatus";
import type { AdminHomeMapFilterAction } from "@/lib/admin/adminHomeMapFilter";
import { countOpportunitiesPendingTechnicianClosure } from "@/lib/visitPendingClosure";
import type { MapCategoryFilter, MapStallFilter, Opportunity, WorkspaceMember } from "@/types/admin";
import type { TechnicianLocation } from "@/hooks/useTechnicianLocations";
import type { AdminMapDisplayMode } from "@/lib/admin/mapDisplayMode";

export function useAdminMapFilters(params: {
  opportunities: Opportunity[];
  techniciansLocations: TechnicianLocation[];
  workspaceMembers?: WorkspaceMember[];
  changeAdminView: (view: string) => void;
}) {
  const { opportunities, techniciansLocations, workspaceMembers = [], changeAdminView } = params;

  const [mapTab, setMapTab] = useState("unscheduled");
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [serviceTypeFilters, setServiceTypeFilters] = useState<MapCategoryFilter[]>([]);
  const [mapTechnicianFilter, setMapTechnicianFilter] = useState<string | null>(null);
  const [historyOutcomes, setHistoryOutcomes] = useState<MapHistoryOutcome[]>([]);
  const [stallFilter, setStallFilter] = useState<MapStallFilter>("all");
  const [pendingClosureOnly, setPendingClosureOnly] = useState(false);
  const [overdueTodayOnly, setOverdueTodayOnly] = useState(false);
  const [withoutGpsOnly, setWithoutGpsOnly] = useState(false);
  const [mapDisplayMode, setMapDisplayMode] = useState<AdminMapDisplayMode>("map");
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

  const technicians = useMemo(
    () =>
      buildAdminTechnicianRoster({
        workspaceMembers,
        opportunities,
        techniciansLocations,
      }),
    [workspaceMembers, opportunities, techniciansLocations]
  );

  const mapTechnicianOptions = useMemo(
    () =>
      buildMapTechnicianOptions(opportunities, techniciansLocations, [
        ...workspaceMembers.map((m) => m.name),
        ...mapHistoryItems.map((o) => o.technician),
      ]),
    [opportunities, techniciansLocations, workspaceMembers, mapHistoryItems]
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
      overdueTodayOnly,
      withoutGpsOnly,
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
    overdueTodayOnly,
    withoutGpsOnly,
  ]);

  const pendingClosureCount = useMemo(
    () => countOpportunitiesPendingTechnicianClosure(opportunities),
    [opportunities]
  );

  const clearHomeDrillFilters = useCallback(() => {
    setOverdueTodayOnly(false);
    setWithoutGpsOnly(false);
  }, []);

  const openPendingClosureOnMap = useCallback(() => {
    changeAdminView("map");
    setMapTab("scheduled");
    setPendingClosureOnly(true);
    clearHomeDrillFilters();
    setStallFilter("all");
  }, [changeAdminView, clearHomeDrillFilters]);

  const openMapWithHomeFilter = useCallback(
    (action: AdminHomeMapFilterAction) => {
      changeAdminView("map");
      setPendingClosureOnly(false);
      setOverdueTodayOnly(false);
      setWithoutGpsOnly(false);
      setMapDisplayMode("map");
      switch (action) {
        case "overdueToday":
          setMapTab("scheduled");
          setStallFilter("all");
          setOverdueTodayOnly(true);
          break;
        case "withoutGps":
          setMapTab("unscheduled");
          setStallFilter("all");
          setWithoutGpsOnly(true);
          setMapDisplayMode("list");
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

  const openMapWithZone = useCallback(
    (cityKey: string) => {
      changeAdminView("map");
      setPendingClosureOnly(false);
      clearHomeDrillFilters();
      setMapTab("unscheduled");
      setStallFilter("all");
      setCityFilter(cityKey);
      setMapDisplayMode("map");
    },
    [changeAdminView, clearHomeDrillFilters]
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
    overdueTodayOnly,
    setOverdueTodayOnly,
    withoutGpsOnly,
    setWithoutGpsOnly,
    mapDisplayMode,
    setMapDisplayMode,
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
    openMapWithZone,
    calendarOpportunities,
    mapHistoryItems,
    refreshHistory: refreshMapHistory,
  };
}