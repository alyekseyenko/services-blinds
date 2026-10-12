"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  ChevronRight,
  LogOut,
  MapPin,
  MapPinOff,
  Menu,
  RefreshCw,
  WifiOff,
  X,
} from "lucide-react";
import { signOutToAppLogin } from "@/lib/clientSignOut";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/badge";
import SyncQueueSheet from "@/components/dashboard/SyncQueueSheet";
import { APP_LOGO_PATH, APP_SHORT_NAME } from "@/lib/branding";
import { clearSessionStoragePreservingPreferences } from "@/lib/clientPreferences";
import { AppearanceMenu } from "@/components/ui/AppearanceMenu";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/ToastContext";
import InAppNotificationBell from "@/components/ui/InAppNotificationBell";
import type { InAppNotification } from "@/lib/inAppNotifications";
import {
  ONBOARDING_TOUR_ACTION_EVENT,
  type OnboardingTourActionDetail,
} from "@/lib/onboarding/tourActions";
import { formatSyncAgeLabel } from "@/lib/formatSyncAge";
import { useBackToClose } from "@/hooks/useBackToClose";

interface HeaderProps {
  userName: string;
  userId?: string;
  isOnline: boolean;
  tasksCount: number;
  isSyncing: boolean;
  loading: boolean;
  mutateTasks: () => void;
  locationSharingEnabled?: boolean;
  onToggleLocationConsent?: () => void;
  pendingCount?: number;
  failedCount?: number;
  onRetrySync?: () => void;
  onRetrySyncItem?: (itemId: number) => void;
  onRefreshQueueCounts?: () => void;
  resolveQueueTaskLabel?: (taskId: string) => string;
  notificationScope?: string;
  onOpenAgendaNotificationOnMap?: (notification: InAppNotification) => void;
  agendaLastSuccessAt?: number | null;
  agendaDataStale?: boolean;
}

function Header({
  userName,
  userId,
  isOnline,
  tasksCount,
  isSyncing,
  loading,
  mutateTasks,
  locationSharingEnabled = false,
  onToggleLocationConsent,
  pendingCount = 0,
  failedCount = 0,
  onRetrySync,
  onRetrySyncItem,
  onRefreshQueueCounts,
  resolveQueueTaskLabel,
  notificationScope = "technician",
  onOpenAgendaNotificationOnMap,
  agendaLastSuccessAt = null,
  agendaDataStale = false,
}: HeaderProps) {
  const toast = useToast();
  const [queueOpen, setQueueOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutBlockedOpen, setLogoutBlockedOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useBackToClose(mobileMenuOpen, () => setMobileMenuOpen(false), "tech-mobile-menu");

  useEffect(() => {
    const openQueue = () => setQueueOpen(true);
    window.addEventListener("fieldops-open-sync-queue", openQueue);
    return () => window.removeEventListener("fieldops-open-sync-queue", openQueue);
  }, []);

  useEffect(() => {
    const onTourAction = (event: Event) => {
      const action = (event as CustomEvent<OnboardingTourActionDetail>).detail?.action;
      if (!action) return;
      switch (action) {
        case "openTechMobileMenu":
          setMobileMenuOpen(true);
          break;
        case "closeTechMobileMenu":
          setMobileMenuOpen(false);
          break;
        case "openTechSyncQueue":
          setQueueOpen(true);
          break;
        case "closeTechSyncQueue":
          setQueueOpen(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourAction);
    return () => window.removeEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourAction);
  }, []);

  const pendingSyncTotal = pendingCount + failedCount;

  const handleLogout = async () => {
    if (pendingSyncTotal > 0) {
      setLogoutBlockedOpen(true);
      return;
    }
    try {
      const storedId = userId || (typeof window !== "undefined" ? localStorage.getItem("userId") : null);
      if (storedId) {
        await fetch(`/api/location?technicianId=${encodeURIComponent(storedId)}`, {
          method: "DELETE",
          credentials: "include",
        }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
    setLoggingOut(true);
    try {
      clearSessionStoragePreservingPreferences();
      await signOutToAppLogin();
    } catch {
      toast.error("Não foi possível terminar sessão", "Verifique a ligação à internet e tente novamente.");
    } finally {
      setLoggingOut(false);
    }
  };

  const showSyncChip =
    isSyncing || pendingCount > 0 || failedCount > 0 || agendaDataStale;

  const syncChip = (() => {
    if (!isOnline) {
      return {
        label: "Offline",
        className: "border-warning-border bg-warning-surface text-warning-fg",
        icon: <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      };
    }
    if (isSyncing) {
      return {
        label: "A sincronizar",
        className: "border-warning-border bg-warning-surface text-warning-fg",
        icon: <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />,
      };
    }
    if (failedCount > 0) {
      return {
        label: failedCount === 1 ? "1 erro" : `${failedCount} erros`,
        className: "border-danger-border bg-danger-surface text-danger-fg",
        icon: null,
      };
    }
    if (pendingCount > 0) {
      return {
        label: pendingCount === 1 ? "1 por enviar" : `${pendingCount} por enviar`,
        className: "border-warning-border bg-warning-surface text-warning-fg",
        icon: null,
      };
    }
    if (agendaDataStale) {
      return {
        label: `Dados ${formatSyncAgeLabel(agendaLastSuccessAt).toLowerCase()}`,
        className: "border-danger-border bg-danger-surface text-danger-fg",
        icon: null,
      };
    }
    return null;
  })();

  return (
    <>
      <Dialog
        open={logoutBlockedOpen}
        onClose={() => setLogoutBlockedOpen(false)}
        title="Alterações por sincronizar"
        description={
          pendingSyncTotal === 1
            ? "Tem 1 alteração por enviar ao CRM. Termine a sincronização ou use «Tentar sincronizar» antes de sair."
            : `Tem ${pendingSyncTotal} alterações por enviar ao CRM. Termine a sincronização ou use «Tentar sincronizar» antes de sair.`
        }
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setLogoutBlockedOpen(false)}>
              Voltar
            </Button>
            {onRetrySync ? (
              <Button
                type="button"
                onClick={() => {
                  setLogoutBlockedOpen(false);
                  onRetrySync();
                  setQueueOpen(true);
                }}
              >
                Tentar sincronizar
              </Button>
            ) : null}
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Se sair agora, pode perder dados que ainda não chegaram ao Twenty CRM.
        </p>
      </Dialog>
      <header className="safe-top z-30 shrink-0 border-b-2 border-border-strong bg-card text-card-foreground">
        <div className="mx-auto flex w-full max-w-[100rem] items-center justify-between gap-2 p-3 max-md:landscape:py-2 md:gap-3 md:p-5">
          <div className="flex min-w-0 items-center gap-2.5 md:gap-4">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-border-strong bg-ink">
                <Image
                  src={APP_LOGO_PATH}
                  alt=""
                  width={40}
                  height={40}
                  className="h-9 w-9 object-contain md:h-10 md:w-10"
                />
              </div>
              <div
                className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card md:h-4 md:w-4 ${
                  isOnline ? "bg-primary" : "bg-warning-solid"
                }`}
                aria-label={isOnline ? "Em linha" : "Sem ligação"}
              />
            </div>
            <div className="min-w-0">
              <h1 className="ds-title truncate text-base leading-none tracking-tight text-foreground md:text-lg">
                {userName || "Técnico"}
              </h1>
              <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
                {APP_SHORT_NAME} · {tasksCount} tarefa{tasksCount === 1 ? "" : "s"}
              </p>
              {showSyncChip && syncChip && (
                <button
                  type="button"
                  data-tour="tech-header-sync-chip"
                  onClick={() => {
                    if (pendingCount > 0 || failedCount > 0) setQueueOpen(true);
                  }}
                  className={`mt-1.5 inline-flex min-h-12 max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-black uppercase tracking-wide ${syncChip.className} ${
                    pendingCount > 0 || failedCount > 0 ? "cursor-pointer" : "cursor-default"
                  }`}
                  aria-label={syncChip.label}
                >
                  {syncChip.icon}
                  <span className="truncate">{syncChip.label}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2">
            {(pendingCount > 0 || failedCount > 0) && (
              <button
                type="button"
                onClick={() => setQueueOpen(true)}
                className="hidden min-h-12 items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5 shadow-sm md:flex md:px-3"
                aria-label="Abrir fila de sincronização"
              >
                {pendingCount > 0 && (
                  <Badge variant="warning">{pendingCount}</Badge>
                )}
                {failedCount > 0 && <Badge variant="error">{failedCount}</Badge>}
              </button>
            )}

            <div className="hidden items-center gap-1.5 md:flex lg:gap-2">
              {onToggleLocationConsent && (
                <IconButton
                  onClick={onToggleLocationConsent}
                  data-tour="tech-gps"
                  aria-label={
                    locationSharingEnabled
                      ? "GPS ativo — clique para pausar"
                      : "GPS pausado — clique para ativar"
                  }
                  className={
                    locationSharingEnabled
                      ? "border-primary bg-primary/10 text-primary-ink"
                      : "text-muted-foreground"
                  }
                >
                  {locationSharingEnabled ? (
                    <MapPin className="h-5 w-5 text-primary-ink" />
                  ) : (
                    <MapPinOff className="h-5 w-5" />
                  )}
                </IconButton>
              )}

              <IconButton
                onClick={mutateTasks}
                disabled={loading || isSyncing}
                aria-label="Sincronizar tarefas"
                data-tour="tech-header-sync"
                className={isSyncing ? "text-warning-solid" : ""}
              >
                <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin" : ""}`} />
              </IconButton>

              <InAppNotificationBell
                scope={notificationScope}
                dataTour="tech-header-notifications"
                onOpenTaskOnMap={onOpenAgendaNotificationOnMap}
              />

              <AppearanceMenu layout="toolbar" />

              <IconButton
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label="Terminar sessão"
                variant="danger"
                data-tour="tech-logout"
              >
                <LogOut className="h-5 w-5" />
              </IconButton>
            </div>

            <div className="flex items-center gap-1 md:hidden">
              <InAppNotificationBell
                scope={notificationScope}
                dataTour="tech-header-notifications"
                onOpenTaskOnMap={onOpenAgendaNotificationOnMap}
              />
            </div>

            <button
              type="button"
              data-tour="tech-mobile-menu-trigger"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-xl border border-border bg-card text-foreground md:hidden"
              aria-label="Mais opções"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-card safe-bottom md:hidden"
          role="dialog"
          aria-label="Menu do técnico"
          data-tour="tech-mobile-menu-sheet"
        >
          <div className="safe-top flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-bold text-foreground">Menu</p>
              <p className="text-xs font-semibold text-muted-foreground">Sincronização, GPS e sessão</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
              Sincronização
            </p>
            <ul className="mb-6 space-y-2">
              <li>
                <button
                  type="button"
                  data-tour="tech-header-sync"
                  onClick={() => {
                    mutateTasks();
                    setMobileMenuOpen(false);
                  }}
                  disabled={loading || isSyncing}
                  className="flex w-full min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin" : ""}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">Atualizar agenda</span>
                    <span className="text-xs font-medium text-muted-foreground">Buscar alterações do CRM</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setQueueOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-surface text-warning-fg">
                    <WifiOff className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">Fila offline</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {pendingSyncTotal > 0
                        ? `${pendingSyncTotal} pendente(s)`
                        : "Alterações guardadas no telemóvel"}
                    </span>
                  </span>
                  {pendingSyncTotal > 0 ? (
                    <span className="rounded-full bg-warning-solid px-2 py-0.5 text-xs font-bold text-primary-foreground">
                      {pendingSyncTotal > 9 ? "9+" : pendingSyncTotal}
                    </span>
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                </button>
              </li>
            </ul>

            <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
              Preferências
            </p>
            <ul className="mb-6 space-y-2">
              {onToggleLocationConsent && (
                <li>
                  <button
                    type="button"
                    data-tour="tech-gps"
                    onClick={() => {
                      onToggleLocationConsent();
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        locationSharingEnabled ? "bg-primary/15 text-primary-ink" : "bg-muted"
                      }`}
                    >
                      {locationSharingEnabled ? (
                        <MapPin className="h-5 w-5" />
                      ) : (
                        <MapPinOff className="h-5 w-5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-foreground">Partilha de GPS</span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {locationSharingEnabled ? "Ativo — visível no mapa admin" : "Pausado"}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              )}
              <AppearanceMenu layout="sheet-rows" />
            </ul>

          </div>

          <div className="shrink-0 border-t border-border px-4 py-4">
            <button
              type="button"
              data-tour="tech-logout"
              onClick={() => {
                setMobileMenuOpen(false);
                void handleLogout();
              }}
              disabled={loggingOut}
              className="flex w-full min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-danger-border bg-danger-surface text-sm font-bold text-danger-fg disabled:opacity-50"
            >
              <LogOut className="h-5 w-5" />
              Terminar sessão
            </button>
          </div>
        </div>
      )}

      <SyncQueueSheet
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        pendingCount={pendingCount}
        failedCount={failedCount}
        resolveTaskLabel={resolveQueueTaskLabel}
        onAfterDiscard={onRefreshQueueCounts}
        onRetryItem={onRetrySyncItem}
        onRetry={() => {
          onRetrySync?.();
          setQueueOpen(false);
        }}
      />
    </>
  );
}

export default React.memo(Header);
