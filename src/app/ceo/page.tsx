"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [metrics, setMetrics] = useState<CeoMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const userRole = (session?.user as { role?: AppRole } | undefined)?.role;

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session || !userRole || !canAccessCeoPanel(userRole)) {
      router.replace("/");
    }
  }, [session, sessionStatus, userRole, router]);

  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<CeoTab>("summary");

  const loadMetrics = async (year: number | null, showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const res = await getCeoMetricsAction(year);
      if (res.success && res.data) {
        setMetrics(res.data);
        if (res.data.selectedYear !== undefined) {
          setSelectedYear(res.data.selectedYear);
        }
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
        toast.error("Erro ao Carregar", res.error || "Não foi possível obter os dados.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de Ligação", "Falha de rede ao consultar o servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics(selectedYear);
  }, []);

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year);
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
      <div className="min-h-screen bg-[#f3f5fa] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#84cc16] rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
          A validar credenciais executivas...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f3f5fa] text-slate-800 font-sans pb-24">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#84cc16]/6 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/3 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-6">
        <CeoHeader
          lastUpdated={lastUpdated}
          selectedYear={selectedYear}
          yearOptions={yearOptions}
          onYearChange={handleYearChange}
          onRefresh={() => loadMetrics(selectedYear, true)}
          refreshing={refreshing}
          metricsLoaded={!!metrics}
        />

        {loading ? (
          <KpiGridSkeleton />
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
