"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useToast } from "@/components/ui/ToastContext";
import { clearSessionStoragePreservingPreferences } from "@/lib/clientPreferences";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  completeWarehouseOrderAction,
  fetchWarehousePreparationListAction,
} from "@/actions/warehouse-actions";
import {
  computeWarehouseStats,
  filterWarehouseServices,
  getWarehouseGreeting,
} from "@/lib/warehouse/preparationStats";
import type { WarehouseService } from "@/lib/warehouse/types";
import WarehouseHeader from "@/components/warehouse/WarehouseHeader";
import WarehouseFooter from "@/components/warehouse/WarehouseFooter";
import WarehouseDashboardView from "@/components/warehouse/views/WarehouseDashboardView";

export default function WarehouseDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [services, setServices] = useState<WarehouseService[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("");
  const [syncTime, setSyncTime] = useState<Date | null>(null);

  const loadData = async (showSync = false) => {
    if (showSync) setIsSyncing(true);
    else setLoading(true);

    try {
      const result = await fetchWarehousePreparationListAction();
      if (!result.success) {
        toast.error("Erro ao carregar", result.error || "Não foi possível obter a lista de preparação.");
        return;
      }
      setServices(result.data ?? []);
      setSyncTime(new Date());
    } catch (e) {
      console.error("Error loading warehouse data:", e);
      toast.error("Erro de ligação", "Falha ao sincronizar com o CRM.");
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === "loading") return;

    const role = (session?.user as { role?: string })?.role;
    if (!session || role !== "warehouse") {
      router.replace("/");
    } else {
      setUserName(session?.user?.name || "Colaborador Armazém");
      loadData();
    }
  }, [session, sessionStatus, router]);

  const handleLogout = async () => {
    clearSessionStoragePreservingPreferences();
    await signOut({ callbackUrl: "/" });
  };

  const handleComplete = async (opportunityId: string) => {
    const result = await completeWarehouseOrderAction(opportunityId);
    if (!result.success) {
      toast.error("Erro ao concluir", result.error || "Não foi possível avançar a encomenda.");
      return;
    }

    setServices((prev) => prev.filter((s) => s.id !== opportunityId));
    toast.success("Encomenda concluída", "Passou para a etapa de Agendamento de Instalação.");
  };

  usePullToRefresh({
    enabled: !loading,
    onRefresh: () => loadData(true),
  });

  const filteredServices = useMemo(
    () => filterWarehouseServices(services, searchQuery),
    [services, searchQuery]
  );

  const stats = useMemo(() => computeWarehouseStats(services), [services]);
  const greeting = useMemo(() => getWarehouseGreeting(), []);

  return (
    <div className="min-h-screen bg-[#f3f5fa] text-[#090d16] font-sans pb-24 selection:bg-[#84cc16]/20 selection:text-[#090d16]">
      <WarehouseHeader greeting={greeting} userName={userName} onLogout={handleLogout} />

      <WarehouseDashboardView
        loading={loading}
        isSyncing={isSyncing}
        syncTime={syncTime}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSync={() => loadData(true)}
        stats={stats}
        services={filteredServices}
        onComplete={handleComplete}
      />

      <WarehouseFooter />
    </div>
  );
}
