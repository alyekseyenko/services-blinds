"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOutToAppLogin } from "@/lib/clientSignOut";
import type { Session } from "next-auth";
import { isWarehouseRole } from "@/lib/auth/rbac";
import type { AppRole } from "@/lib/schemas/auth";
import { useResilientSessionGuard } from "@/hooks/useResilientSessionGuard";
import ServerConnectionBanner from "@/components/ui/ServerConnectionBanner";
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
  const [loadFailed, setLoadFailed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);

  const loadData = async (showSync = false) => {
    if (showSync) setIsSyncing(true);
    else setLoading(true);

    try {
      const result = await fetchWarehousePreparationListAction();
      if (!result.success) {
        setLoadFailed(true);
        toast.error("Erro ao carregar", result.error || "Não foi possível obter a lista de preparação.");
        return;
      }
      setLoadFailed(false);
      setServices(result.data ?? []);
      setSyncTime(new Date());
    } catch (e) {
      console.error("Error loading warehouse data:", e);
      setLoadFailed(true);
      toast.error("Erro de ligação", "Falha ao sincronizar com o CRM.");
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const { status: sessionStatus, serverUnreachable } = useResilientSessionGuard({
    isAuthorized: (s: Session) => {
      const role = (s.user as { role?: AppRole })?.role;
      return Boolean(role && isWarehouseRole(role));
    },
    onAuthorized: (s) => {
      setUserName(s.user?.name || "Colaborador Armazém");
      void loadData();
    },
  });

  const handleLogout = async () => {
    clearSessionStoragePreservingPreferences();
    await signOutToAppLogin();
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
    enabled: !loading && Boolean(scrollEl),
    scrollElement: scrollEl,
    onRefresh: () => loadData(true),
  });

  const filteredServices = useMemo(
    () => filterWarehouseServices(services, searchQuery),
    [services, searchQuery]
  );

  const stats = useMemo(() => computeWarehouseStats(services), [services]);
  const greeting = useMemo(() => getWarehouseGreeting(), []);

  return (
    <div className="flex min-h-dvh flex-col brutal-grid-bg bg-background font-sans text-foreground selection:bg-primary/20 selection:text-foreground">
      <ServerConnectionBanner visible={serverUnreachable} />
      <WarehouseHeader greeting={greeting} userName={userName} onLogout={handleLogout} />

      <div
        ref={(node) => {
          scrollRef.current = node;
          setScrollEl(node);
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24"
      >
      {loadFailed && !loading && services.length === 0 && (
        <div className="mx-4 mt-4 rounded-2xl border border-danger-border bg-danger-surface p-6 text-center">
          <p className="text-sm font-black text-danger-fg">Não foi possível carregar a lista de preparação.</p>
          <button
            type="button"
            onClick={() => loadData()}
            className="mt-3 rounded-xl bg-danger-solid px-4 py-2 text-xs font-black uppercase text-ink-foreground"
          >
            Tentar de novo
          </button>
        </div>
      )}

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

      </div>

      <WarehouseFooter />
    </div>
  );
}
