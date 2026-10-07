"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  LogOut,
  RefreshCw,
  Activity,
  TrendingUp,
  Menu,
  X,
  Search,
  Bell,
  Ruler,
  LayoutDashboard,
  ClipboardPlus,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { signOutToAppLogin } from "@/lib/clientSignOut";
import {
  canAccessAdminPanel,
  canAccessCeoPanel,
  isStrictAdminRole,
  resolveWorkspaceMemberId,
  type AppSessionUser,
} from "@/lib/auth/session";
import type { AppRole } from "@/lib/schemas/auth";
import { APP_LOGO_PATH } from "@/lib/branding";
import { clearSessionStoragePreservingPreferences } from "@/lib/clientPreferences";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import InAppNotificationBell from "@/components/ui/InAppNotificationBell";
import { getNotificationScope, type InAppNotification } from "@/lib/inAppNotifications";
import { AdminPrimaryNav } from "@/components/admin/AdminPrimaryNav";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import {
  ONBOARDING_TOUR_ACTION_EVENT,
  type OnboardingTourActionDetail,
} from "@/lib/onboarding/tourActions";
import { formatSyncAgeLabel } from "@/lib/formatSyncAge";
import { useBackToClose } from "@/hooks/useBackToClose";
import { adminFullBleedShell } from "@/lib/admin/fullBleedShell";

interface AdminHeaderProps {
  opportunitiesCount: number;
  lastSync: Date | null;
  syncDataStale?: boolean;
  loading: boolean;
  isSyncing: boolean;
  router: { push: (path: string) => void };
  onRefresh: () => void;
  onOpenSearch?: () => void;
  onOpenCreateService?: () => void;
  userName: string;
  view: string;
  setView: (v: string) => void;
  onInvestigateAgendaNotification?: (notification: InAppNotification) => void;
  /** Cabeçalho hero em ecrã inteiro (vista Início), estilo lista de medições. */
  layout?: "toolbar" | "dashboard";
}

const ADMIN_MENU_ITEM_CLASS =
  "mb-2 flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-muted active:scale-[0.99]";

function AdminPanelMenuItem({
  icon: Icon,
  label,
  detail,
  onClick,
  dataTour,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail?: string;
  onClick: () => void;
  dataTour?: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      data-tour={dataTour}
      onClick={onClick}
      className={cn(
        ADMIN_MENU_ITEM_CLASS,
        tone === "danger" && "border-danger-border bg-danger-surface hover:bg-danger-surface"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-muted",
          tone === "danger" && "border-danger-border bg-card"
        )}
      >
        <Icon
          className={cn("h-5 w-5", tone === "danger" ? "text-danger-fg" : "text-primary-ink")}
          aria-hidden
        />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-bold",
            tone === "danger" ? "text-danger-fg" : "text-foreground"
          )}
        >
          {label}
        </span>
        {detail ? (
          <span className="block text-xs font-medium text-muted-foreground">{detail}</span>
        ) : null}
      </span>
    </button>
  );
}

function SyncChip({
  isSyncing,
  syncDataStale,
  syncLabel,
  onRefresh,
  loading,
  className,
  dataTour,
}: {
  isSyncing: boolean;
  syncDataStale?: boolean;
  syncLabel: string;
  onRefresh: () => void;
  loading: boolean;
  className?: string;
  dataTour?: string;
}) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading || isSyncing}
      data-tour={dataTour}
      className={cn(
        "flex min-h-10 max-w-[11rem] items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-all disabled:opacity-60 md:min-h-11 md:px-3",
        isSyncing
          ? "border-warning-border bg-warning-surface text-warning-fg"
          : syncDataStale
            ? "border-danger-border bg-danger-surface text-danger-fg"
            : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
        className
      )}
      title="Sincronizar CRM"
      aria-label="Sincronizar CRM"
    >
      <RefreshCw
        className={cn("h-4 w-4 shrink-0", isSyncing ? "animate-spin text-warning-solid" : "")}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight">
        {isSyncing ? "A sincronizar…" : syncLabel}
      </span>
    </button>
  );
}

export default function AdminHeader({
  opportunitiesCount,
  lastSync,
  syncDataStale = false,
  loading,
  isSyncing,
  router,
  onRefresh,
  onOpenSearch,
  onOpenCreateService,
  userName,
  view,
  setView,
  onInvestigateAgendaNotification,
  layout = "toolbar",
}: AdminHeaderProps) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: AppRole } | undefined)?.role;
  const memberId = resolveWorkspaceMemberId(session?.user as AppSessionUser | undefined);
  const notificationScope = memberId ? getNotificationScope("admin", memberId) : "";
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const { dismissForNavigation: dismissNavMenuForNavigation } = useBackToClose(
    navMenuOpen,
    () => setNavMenuOpen(false),
    "admin-nav-menu"
  );

  const closeNavMenu = useCallback(() => setNavMenuOpen(false), []);

  const openOverlayFromMenu = useCallback(
    (action: () => void) => {
      dismissNavMenuForNavigation();
      requestAnimationFrame(() => action());
    },
    [dismissNavMenuForNavigation]
  );

  const navigateFromAdminMenu = useCallback(
    (path: string) => {
      dismissNavMenuForNavigation();
      router.push(path);
    },
    [dismissNavMenuForNavigation, router]
  );

  const selectViewFromMenu = useCallback(
    (next: string) => {
      dismissNavMenuForNavigation();
      setView(next);
    },
    [dismissNavMenuForNavigation, setView]
  );

  const [mounted, setMounted] = useState(false);
  const navMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onTourAction = (event: Event) => {
      const action = (event as CustomEvent<OnboardingTourActionDetail>).detail?.action;
      if (!action) return;
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      switch (action) {
        case "openAdminMobileMenu":
        case "openAdminDesktopMenu":
          setNavMenuOpen(true);
          break;
        case "closeAdminMobileMenu":
        case "closeAdminDesktopMenu":
          setNavMenuOpen(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourAction);
    return () => window.removeEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourAction);
  }, []);

  useEffect(() => {
    if (!navMenuOpen || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navMenuOpen]);

  const syncLabel =
    mounted && lastSync
      ? syncDataStale
        ? `Desatualizado · ${formatSyncAgeLabel(lastSync.getTime())}`
        : lastSync.toLocaleString("pt-PT", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
      : "A aguardar sync";

  const accountMenuItems = (
    <>
      <div className={cn(ADMIN_MENU_ITEM_CLASS, "cursor-default hover:bg-card")}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-muted">
          <LayoutDashboard className="h-5 w-5 text-primary-ink" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="text-sm font-bold text-foreground">Tema</span>
          <ThemeToggle />
        </span>
      </div>
      {session && userRole && canAccessCeoPanel(userRole) && (
        <AdminPanelMenuItem
          icon={TrendingUp}
          label="Painel CEO"
          detail="Métricas executivas"
          dataTour="admin-menu-ceo"
          onClick={() => navigateFromAdminMenu("/ceo")}
        />
      )}
      {session && userRole && isStrictAdminRole(userRole) && (
        <AdminPanelMenuItem
          icon={Activity}
          label="Consola SRE"
          detail="Observabilidade e saúde"
          dataTour="admin-menu-sre"
          onClick={() => navigateFromAdminMenu("/admin/observabilidade")}
        />
      )}
      <AdminPanelMenuItem
        icon={LogOut}
        label="Terminar sessão"
        tone="danger"
        onClick={async () => {
          dismissNavMenuForNavigation();
          clearSessionStoragePreservingPreferences();
          await signOutToAppLogin();
        }}
      />
    </>
  );

  const navMenuPortal =
    navMenuOpen && mounted
      ? createPortal(
          <div
            className="admin-header-mobile-sheet fixed inset-0 z-[200] flex bg-scrim md:justify-end"
            role="presentation"
            onClick={closeNavMenu}
          >
            <div
              ref={navMenuRef}
              data-tour="admin-mobile-menu-sheet"
              className="safe-bottom flex max-h-[92dvh] w-full flex-col overflow-y-auto border-2 border-border-strong bg-card p-5 md:max-h-none md:max-w-sm md:rounded-none md:rounded-l-2xl md:border-r-0"
              role="dialog"
              aria-label="Menu do painel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">Menu do painel</p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Vistas, medições, pesquisa, sincronização e conta.
                  </p>
                </div>
                <IconButton aria-label="Fechar menu" variant="ghost" onClick={closeNavMenu}>
                  <X className="h-5 w-5" />
                </IconButton>
              </div>

              <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Vistas
              </p>
              <div className="mb-4" data-tour="admin-views-mobile">
                <AdminPrimaryNav view={view} setView={selectViewFromMenu} />
              </div>

              <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Operações
              </p>
              {onOpenCreateService && (
                <AdminPanelMenuItem
                  icon={ClipboardPlus}
                  label="Novo serviço"
                  detail="Cliente já no Twenty CRM"
                  dataTour="admin-menu-novo-servico"
                  onClick={() => openOverlayFromMenu(onOpenCreateService)}
                />
              )}
              {onOpenSearch && (
                <AdminPanelMenuItem
                  icon={Search}
                  label="Pesquisar serviços"
                  detail="Cliente, morada, serviço"
                  dataTour="admin-search"
                  onClick={() => openOverlayFromMenu(onOpenSearch)}
                />
              )}
              {session && userRole && canAccessAdminPanel(userRole) && (
                <AdminPanelMenuItem
                  icon={Ruler}
                  label="Lista de medições"
                  detail="Fichas e exportações"
                  dataTour="admin-menu-medicoes"
                  onClick={() => navigateFromAdminMenu("/admin/medicoes")}
                />
              )}
              <div className="mb-4 mt-1 rounded-xl border-2 border-border bg-card p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sincronização
                </p>
                <SyncChip
                  isSyncing={isSyncing}
                  syncDataStale={syncDataStale}
                  syncLabel={syncLabel}
                  onRefresh={onRefresh}
                  loading={loading}
                  dataTour="admin-refresh"
                  className="w-full max-w-none justify-start border-2 border-border"
                />
              </div>

              <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Conta
              </p>
              {accountMenuItems}
            </div>
          </div>,
          document.body
        )
      : null;

  const searchTrigger =
    onOpenSearch ? (
      <IconButton
        aria-label="Pesquisar serviços"
        data-tour="admin-search admin-search-header"
        className="min-h-11 min-w-11"
        onClick={onOpenSearch}
      >
        <Search className="h-5 w-5" />
      </IconButton>
    ) : null;

  const notificationBell = (
    <div className="relative shrink-0" data-tour="admin-header-notifications">
      {notificationScope ? (
        <InAppNotificationBell
          scope={notificationScope}
          onInvestigate={onInvestigateAgendaNotification}
        />
      ) : (
        <IconButton aria-label="Avisos da agenda" className="relative" disabled>
          <Bell className="h-5 w-5 opacity-40" />
        </IconButton>
      )}
    </div>
  );

  const menuTrigger = (
    <IconButton
      aria-label="Menu do painel"
      aria-expanded={navMenuOpen}
      data-tour="admin-mobile-menu-trigger admin-desktop-more-menu"
      className="min-h-11 min-w-11"
      onClick={() => setNavMenuOpen(true)}
    >
      <Menu className="h-5 w-5" />
    </IconButton>
  );

  if (layout === "dashboard") {
    return (
      <>
        <header
          className="safe-top relative z-30 shrink-0 border-b border-border bg-card text-card-foreground"
          data-tour="admin-home-dashboard-header"
        >
          <div className={adminFullBleedShell.headerInner}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-muted">
                  <LayoutDashboard className="h-6 w-6 text-primary-ink" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl font-black text-foreground">Painel operacional</h1>
                  <p className="text-sm font-medium text-muted-foreground">
                    Medidas, instalações, reparações e restantes serviços — pipeline e atalhos.
                  </p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    {userName || "Operador"} · {opportunitiesCount} serviços no mapa
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {searchTrigger}
                {notificationBell}
                {menuTrigger}
              </div>
            </div>
            <SyncChip
              isSyncing={isSyncing}
              syncDataStale={syncDataStale}
              syncLabel={syncLabel}
              onRefresh={onRefresh}
              loading={loading}
              dataTour="admin-refresh"
              className="w-full max-w-none justify-start"
            />
          </div>
        </header>
        {navMenuPortal}
      </>
    );
  }

  return (
    <>
      <header className="safe-top relative z-30 shrink-0 border-b-2 border-border-strong bg-card text-card-foreground">
        <div className="mx-auto grid w-full max-w-[100rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div className="relative shrink-0">
              <Image
                src={APP_LOGO_PATH}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                  isSyncing ? "bg-warning-solid" : "bg-primary"
                )}
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <h1 className="max-w-[4.5rem] truncate text-xs font-bold leading-tight text-foreground min-[420px]:max-w-[7rem] sm:max-w-[10rem] sm:text-sm md:max-w-none">
                {userName || "Painel"}
              </h1>
              <p className="hidden truncate text-xs font-medium text-muted-foreground min-[420px]:block sm:block">
                {opportunitiesCount} serviços
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
            {searchTrigger}
            {notificationBell}
            {menuTrigger}
          </div>
        </div>
      </header>
      {navMenuPortal}
    </>
  );
}
