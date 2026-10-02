"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { useResilientSessionGuard } from "@/hooks/useResilientSessionGuard";
import ServerConnectionBanner from "@/components/ui/ServerConnectionBanner";
import { KpiGridSkeleton } from "@/components/ui/Skeleton";
import { getCeoMetricsAction } from "@/actions/ceoMetrics";
import { CeoMetrics } from "@/lib/schemas/ceoMetrics";
import { useToast } from "@/components/ui/ToastContext";
import { canAccessCeoPanel } from "@/lib/auth/session";
import type { AppRole } from "@/lib/schemas/auth";
import { filterCeoServices, getMaxMonthTotal } from "@/lib/ceo/serviceFilters";
import CeoHeader from "@/components/ceo/CeoHeader";
import CeoTabNav, { type CeoTab } from "@/components/ceo/CeoTabNav";
import CeoSummaryView from "@/components/ceo/views/CeoSummaryView";
import CeoCommercialView from "@/components/ceo/views/CeoCommercialView";
import CeoOperationsView from "@/components/ceo/views/CeoOperationsView";
import CeoFeedbackView from "@/components/ceo/views/CeoFeedbackView";

export default function CeoDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [metrics, setMetrics] = useState<CeoMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<CeoTab>("summary");

  const loadMetrics = useCallback(async (year: number | null, showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const res = await getCeoMetricsAction(year);
      if (res.success && res.data) {
        setLoadFailed(false);
        setMetrics(res.data);
        setSelectedYear(res.data.selectedYear !== undefined ? res.data.selectedYear : year);
        setLastUpdated(
          new Date().toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
        if (showToast) {
          toast.success(
            "Métricas Atualizadas",
            `Dados sincronizados para ${year ? `o ano ${year}` : "todos os anos"}.`
          );
        }
      } else {
        setLoadFailed(true);
        toast.error("Erro ao Carregar", res.error || "Não foi possível obter os dados.");
      }
    } catch (err) {
      console.error(err);
      setLoadFailed(true);
      toast.error("Erro de Ligação", "Falha de rede ao consultar o servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  const { session, status: sessionStatus, serverUnreachable } = useResilientSessionGuard({
    isAuthorized: (s: Session) => {
      const role = (s.user as { role?: AppRole })?.role;
      return Boolean(role && canAccessCeoPanel(role));
    },
    onAuthorized: () => {
      void loadMetrics(selectedYear);
    },
  });

  const userRole = (session?.user as { role?: AppRole } | undefined)?.role;

  const handleYearChange = (year: number | null) => {
    setSelectedMonth(null);
    loadMetrics(year, true);
  };

  const yearOptions = useMemo(
    () => [
      { value: null as number | null, label: "Todos os anos" },
      ...(metrics?.availableYears ?? []).map((yr) => ({
        value: yr,
        label: String(yr),
      })),
    ],
    [metrics?.availableYears]
  );

  const filteredServices = useMemo(
    () =>
      filterCeoServices(metrics?.servicesList ?? [], {
        selectedMonth,
        stageFilter,
        searchQuery,
      }),
    [metrics?.servicesList, selectedMonth, stageFilter, searchQuery]
  );

  const maxMonthTotal = useMemo(
    () => getMaxMonthTotal(metrics?.monthlyEvolution ?? []),
    [metrics?.monthlyEvolution]
  );

  if (sessionStatus === "loading" || !session || !userRole || !canAccessCeoPanel(userRole)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 brutal-grid-bg bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-border-strong border-t-primary" />
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest animate-pulse">
          A validar credenciais executivas...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full brutal-grid-bg bg-background pb-24 font-sans text-foreground">
      <ServerConnectionBanner visible={serverUnreachable} />
      <div className="relative z-10 w-full px-4 pt-6 sm:px-6 lg:px-8 xl:px-10">
        <CeoHeader
          lastUpdated={lastUpdated}
          selectedYear={selectedYear}
          yearOptions={yearOptions}
          onYearChange={handleYearChange}
          onRefresh={() => loadMetrics(selectedYear, true)}
          refreshing={refreshing || loading}
          metricsLoaded={!!metrics}
        />

        {loading ? (
          <KpiGridSkeleton />
        ) : loadFailed && !metrics ? (
          <div className="rounded-2xl border border-danger-border bg-danger-surface p-8 text-center">
            <p className="text-sm font-black text-danger-fg">Não foi possível carregar as métricas.</p>
            <button
              type="button"
              onClick={() => loadMetrics(selectedYear, true)}
              className="mt-4 rounded-xl bg-danger-solid px-4 py-2 text-xs font-black uppercase text-ink-foreground"
            >
              Tentar de novo
            </button>
          </div>
        ) : metrics ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <CeoTabNav activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === "summary" && (
              <CeoSummaryView
                metrics={metrics}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onSelectedMonthChange={setSelectedMonth}
                maxMonthTotal={maxMonthTotal}
              />
            )}

            {activeTab === "commercial" && (
              <CeoCommercialView
                metrics={metrics}
                filteredServices={filteredServices}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                stageFilter={stageFilter}
                onStageFilterChange={setStageFilter}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
              />
            )}

            {activeTab === "operations" && (
              <CeoOperationsView metrics={metrics} selectedYear={selectedYear} />
            )}

            {activeTab === "feedback" && <CeoFeedbackView metrics={metrics} />}
          </div>
        ) : null}
      </div>
    </div>
  );
}
