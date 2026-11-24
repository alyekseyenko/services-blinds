"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { KeyedMutator } from "swr";
import type { Session } from "next-auth";
import { isStrictAdminRole, resolveWorkspaceMemberId, type AppSessionUser } from "@/lib/auth/session";
import { useObservabilityAdminAlerts } from "@/hooks/useObservabilityAdminAlerts";
import { useAgendaNotifications } from "@/hooks/useAgendaNotifications";
import { useClientRatingNotifications } from "@/hooks/useClientRatingNotifications";
import { buildAgendaSnapshotItem, toSafeIso } from "@/lib/agendaDiff";
import {
  getNotificationScope,
  migrateLegacyInAppNotificationScope,
  type InAppNotification,
} from "@/lib/inAppNotifications";
import { migrateLegacyAgendaSnapshotScope } from "@/lib/agendaSnapshotStorage";
import { isTerminalHistoryStatus } from "@/lib/crm/dateFilters";
import { normalizeOpportunityDates } from "@/lib/admin/opportunityNormalizers";
import { searchOpportunities, suggestMapTabForOpportunity } from "@/lib/admin/opportunitySearch";
import type { AdminAgendaFeedFromSchema } from "@/lib/schemas/agendaFeed";
import type { Opportunity } from "@/types/admin";
import { useToast } from "@/components/ui/ToastContext";

type AdminToast = ReturnType<typeof useToast>;

export type UseAdminAgendaSearchAndNotificationsParams = {
  session: Session | null;
  sessionStatus: string;
  agendaFeed: AdminAgendaFeedFromSchema | undefined;
  agendaFeedError: unknown;
  opportunities: Opportunity[];
  mapHistoryItems: Opportunity[];
  mutateOpps: KeyedMutator<Opportunity[]>;
  setSelectedOpportunity: (opp: Opportunity | null) => void;
  setMapTextSearch: (q: string | null) => void;
  setMapFocusOpportunityId: (id: string | null) => void;
  setMapTab: (tab: string) => void;
  changeAdminView: (view: string) => void;
  setSelectedTechnician: (name: string) => void;
  setMapTechnicianFilter: (name: string | null) => void;
  handleRefresh: () => Promise<void>;
  openScheduleModal: (opp: Opportunity) => void;
  toast: AdminToast;
};

export function useAdminAgendaSearchAndNotifications({
  session,
  sessionStatus,
  agendaFeed,
  agendaFeedError,
  opportunities,
  mapHistoryItems,
  mutateOpps,
  setSelectedOpportunity,
  setMapTextSearch,
  setMapFocusOpportunityId,
  setMapTab,
  changeAdminView,
  setSelectedTechnician,
  setMapTechnicianFilter,
  handleRefresh,
  openScheduleModal,
  toast,
}: UseAdminAgendaSearchAndNotificationsParams) {
  const memberId = resolveWorkspaceMemberId(session?.user as AppSessionUser | undefined);
  const adminNotificationScope = memberId ? getNotificationScope("admin", memberId) : "";
  const strictAdmin =
    Boolean(session?.user?.role && isStrictAdminRole(session.user.role as import("@/lib/schemas/auth").AppRole));
  useObservabilityAdminAlerts(strictAdmin, adminNotificationScope);

  const agendaNotificationsReady =
    Boolean(memberId) &&
    sessionStatus !== "loading" &&
    !agendaFeedError &&
    agendaFeed !== undefined;

  useEffect(() => {
    if (!adminNotificationScope) return;
    migrateLegacyInAppNotificationScope(adminNotificationScope);
    migrateLegacyAgendaSnapshotScope(adminNotificationScope);
  }, [adminNotificationScope]);

  const agendaSnapshotItems = useMemo(() => {
    if (!agendaNotificationsReady || !agendaFeed) return null;
    return agendaFeed.tasks.map((t) =>
      buildAgendaSnapshotItem({
        id: t.id,
        dueAt: toSafeIso(t.dueAt),
        status: t.status,
        client: t.client,
        nsi: t.nsi,
        serviceNumber: t.serviceNumber,
        visitTitle: t.visitTitle,
        opportunityId: t.opportunityId,
        technicianName: t.technicianName,
        assigneeId: t.assigneeId,
        onSiteOpportunityIds: t.onSiteOpportunityIds,
        onSiteServices: t.onSiteServices,
        statusNote: t.statusNote,
        serviceType: t.serviceType,
        urgent: t.urgent,
      })
    );
  }, [agendaNotificationsReady, agendaFeed]);

  const pipelineSnapshotItems = useMemo(() => {
    if (!agendaNotificationsReady || !agendaFeed) return null;
    return agendaFeed.pipeline.map((p) => ({
      opportunityId: p.opportunityId,
      stage: p.stage,
      label: p.label,
    }));
  }, [agendaNotificationsReady, agendaFeed]);

  useAgendaNotifications({
    scope: adminNotificationScope,
    items: agendaSnapshotItems,
    ready: agendaNotificationsReady,
    toast,
    pipelineItems: pipelineSnapshotItems,
    enableLateDetection: true,
  });
  useClientRatingNotifications({
    scope: adminNotificationScope,
    ready: agendaNotificationsReady,
    toast,
  });

  const handleAdminPickOpportunity = useCallback(
    (opp: Opportunity, options?: { view?: "map" | "history" }) => {
      const useHistory =
        options?.view === "history" ||
        (options?.view !== "map" && isTerminalHistoryStatus(opp.status));

      setMapTextSearch(null);
      setSelectedOpportunity(opp);

      if (useHistory) {
        changeAdminView("history");
        setMapFocusOpportunityId(null);
      } else {
        changeAdminView("map");
        setMapTab(suggestMapTabForOpportunity(opp));
        setMapFocusOpportunityId(opp.id);
        if (!opp.coordinates) {
          toast.info(
            "Sem coordenadas GPS",
            "Detalhes abertos — este serviço ainda não tem pin no mapa."
          );
        }
      }
    },
    [toast, changeAdminView, setMapTextSearch, setSelectedOpportunity, setMapFocusOpportunityId, setMapTab]
  );

  const handleCommercialServiceCreated = useCallback(
    async (opp: Opportunity, options?: { openSchedule?: boolean }) => {
      await mutateOpps();
      handleAdminPickOpportunity(opp, { view: "map" });
      if (options?.openSchedule) {
        openScheduleModal(opp);
      }
    },
    [mutateOpps, handleAdminPickOpportunity, openScheduleModal]
  );

  const findOpportunityForAgendaNotification = useCallback(
    (notification: InAppNotification) => {
      const pools = [opportunities, mapHistoryItems];
      for (const list of pools) {
        const hit = list.find(
          (o) =>
            (notification.taskId && o.taskId === notification.taskId) ||
            (notification.opportunityId &&
              (o.twentyId === notification.opportunityId || o.id === notification.opportunityId))
        );
        if (hit) return hit;
      }
      return null;
    },
    [opportunities, mapHistoryItems]
  );

  const openAgendaNotificationInvestigate = useCallback(
    async (notification: InAppNotification) => {
      let opp = findOpportunityForAgendaNotification(notification);

      if (!opp) {
        const params = new URLSearchParams();
        if (notification.taskId) params.set("taskId", notification.taskId);
        if (notification.opportunityId) params.set("opportunityId", notification.opportunityId);
        if (params.toString()) {
          try {
            const res = await fetch(`/api/opportunities/lookup?${params}`, {
              credentials: "include",
            });
            if (res.ok) {
              const body = (await res.json()) as { opportunity?: Opportunity };
              if (body.opportunity) {
                opp = normalizeOpportunityDates(body.opportunity);
              }
            }
          } catch {
            /* fallback abaixo */
          }
        }
      }

      if (!opp) {
        toast.warning(
          "Serviço indisponível",
          "Não encontrámos este serviço na lista. A sincronizar o CRM…"
        );
        void handleRefresh();
        return;
      }

      handleAdminPickOpportunity(opp);
    },
    [findOpportunityForAgendaNotification, toast, handleRefresh, handleAdminPickOpportunity]
  );

  const handleAdminMapTextSearch = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      setMapTextSearch(q);
      setMapFocusOpportunityId(null);
      changeAdminView("map");
      const hits = searchOpportunities(opportunities, q, 50);
      if (hits.length === 0) {
        toast.warning("Sem resultados", "Nenhum serviço corresponde à pesquisa.");
        return;
      }
      if (hits.length === 1) {
        handleAdminPickOpportunity(hits[0]);
        return;
      }
      const withGps = hits.filter((h) => h.coordinates && Array.isArray(h.coordinates));
      toast.info(
        `${hits.length} serviços encontrados`,
        withGps.length > 0
          ? `${withGps.length} com pin no mapa. Use «Lista» para ver todos e agendar.`
          : "Nenhum tem GPS no mapa — use «Lista» para ver resultados e agendar."
      );
    },
    [opportunities, toast, handleAdminPickOpportunity, changeAdminView, setMapTextSearch, setMapFocusOpportunityId]
  );

  const handlePaletteSelectTechnician = useCallback(
    (name: string) => {
      setSelectedTechnician(name);
      setMapTechnicianFilter(name);
      changeAdminView("calendar");
    },
    [changeAdminView, setSelectedTechnician, setMapTechnicianFilter]
  );

  return {
    adminNotificationScope,
    handleAdminPickOpportunity,
    handleCommercialServiceCreated,
    openAgendaNotificationInvestigate,
    handleAdminMapTextSearch,
    handlePaletteSelectTechnician,
  };
}