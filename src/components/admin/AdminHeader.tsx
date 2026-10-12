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
  UserPlus,
  type LucideIcon,
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
import { formatSyncAgeLabel } from "@/lib/formatSyncAge";
import { useBackToClose } from "@/hooks/useBackToClose";
import { adminFullBleedShell } from "@/lib/admin/fullBleedShell";
import { DisplayHeading } from "@/components/ui/DisplayHeading";

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
  onOpenCreateClient?: () => void;
  userName: string;
  view: string;
  setView: (v: string) => void;
  onInvestigateAgendaNotification?: (notification: InAppNotification) => void;
  /** Cabeçalho hero em ecrã inteiro (vista Início), estilo lista de medições. */
  layout?: "toolbar" | "dashboard";
}

const ADMIN_MENU_ITEM_CLASS =
  "flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-muted active:scale-[0.99]";

/** Ícones do topo: mesmo alvo de toque e glyph (h-5) em todas as vistas. */
const ADMIN_TOOLBAR_ICON_SIZE = "sm" as const;
const ADMIN_TOOLBAR_ICON_CLASS = "shrink-0";
const ADMIN_TOOLBAR_GLYPH = "h-5 w-5 shrink-0";

function AdminPanelMenuItem({
  icon: Icon,
  label,
  detail,
  onClick,
  dataTour,
  tone = "default",
}: {
  icon: LucideIcon;
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
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-muted",
          tone === "danger" && "border-danger-border bg-card"
        )}
      >
        <Icon
          className={cn(ADMIN_TOOLBAR_GLYPH, tone === "danger" ? "text-danger-fg" : "text-primary-ink")}
          strokeWidth={2}
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
        "flex min-h-12 max-w-[12rem] items-center gap-2 rounded-xl border-2 px-2.5 py-1.5 text-left transition-all disabled:opacity-60 md:min-h-10 md:px-3",
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
        className={cn(ADMIN_TOOLBAR_GLYPH, isSyncing ? "animate-spin text-warning-solid" : "")}
        strokeWidth={2}
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
  onOpenCreateClient,
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
    if (!navMenuOpen || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navMenuOpen]);

  const syncLabel =
    !mounted || !lastSync
      ? "Sincronizar"
      : syncDataStale
        ? `Desatualizado · ${formatSyncAgeLabel(lastSync.getTime())}`
        : `Sincronizar · ${formatSyncAgeLabel(lastSync.getTime())}`;

  const accountMenuItems = (
    <>
      <div className={cn(ADMIN_MENU_ITEM_CLASS, "cursor-default hover:bg-card")}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-muted">
          <LayoutDashboard className={ADMIN_TOOLBAR_GLYPH} strokeWidth={2} aria-hidden />
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
            className="admin-header-mobile-sheet fixed inset-0 z-[200] flex items-stretch bg-scrim md:justify-end"
            role="presentation"
            onClick={closeNavMenu}
          >
            <div
              ref={navMenuRef}
              data-tour="admin-mobile-menu-sheet"
              className="safe-top safe-bottom flex h-full max-h-dvh w-full flex-col gap-4 overflow-y-auto border-2 border-border-strong bg-card p-4 md:max-w-sm md:rounded-none md:rounded-l-2xl md:border-r-0 md:p-5"
              role="dialog"
              aria-label="Menu do painel"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">Menu do painel</p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Vistas, operações e conta. Pesquisa e sync no topo do ecrã.
                  </p>
                </div>
                <IconButton aria-label="Fechar menu" variant="ghost" onClick={closeNavMenu}>
                  <X className={ADMIN_TOOLBAR_GLYPH} strokeWidth={2} aria-hidden />
                </IconButton>
              </div>

              <section className="space-y-2 rounded-xl border-2 border-border bg-muted/30 p-3">
                <p className="ds-kicker px-0.5">Vistas</p>
                <div data-tour="admin-views-mobile">
                  <AdminPrimaryNav view={view} setView={selectViewFromMenu} />
                </div>
              </section>

              <section className="space-y-2">
                <p className="ds-kicker px-0.5">Operações</p>
                <div className="flex flex-col gap-2">
                  {onOpenCreateClient && (
                    <AdminPanelMenuItem
                      icon={UserPlus}
                      label="Novo cliente"
                      detail="Grava o contacto no Twenty CRM"
                      dataTour="admin-menu-novo-cliente"
                      onClick={() => openOverlayFromMenu(onOpenCreateClient)}
                    />
                  )}
                  {onOpenCreateService && (
                    <AdminPanelMenuItem
                      icon={ClipboardPlus}
                      label="Novo serviço"
                      detail="Medição, instalação ou reparação"
                      dataTour="admin-menu-novo-servico"
                      onClick={() => openOverlayFromMenu(onOpenCreateService)}
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
                </div>
              </section>

              <section className="space-y-2">
                <p className="ds-kicker px-0.5">Conta</p>
                <div className="flex flex-col gap-2">{accountMenuItems}</div>
              </section>
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
        size={ADMIN_TOOLBAR_ICON_SIZE}
        className={ADMIN_TOOLBAR_ICON_CLASS}
        onClick={onOpenSearch}
      >
        <Search className={ADMIN_TOOLBAR_GLYPH} strokeWidth={2} aria-hidden />
      </IconButton>
    ) : null;

  const notificationBell = (
    <div className="relative shrink-0" data-tour="admin-header-notifications">
      {notificationScope ? (
        <InAppNotificationBell
          scope={notificationScope}
          onInvestigate={onInvestigateAgendaNotification}
          iconButtonSize={ADMIN_TOOLBAR_ICON_SIZE}
          iconButtonClassName={ADMIN_TOOLBAR_ICON_CLASS}
        />
      ) : (
        <IconButton
          aria-label="Avisos da agenda"
          size={ADMIN_TOOLBAR_ICON_SIZE}
          className={ADMIN_TOOLBAR_ICON_CLASS}
          disabled
        >
          <Bell className={cn(ADMIN_TOOLBAR_GLYPH, "opacity-40")} strokeWidth={2} aria-hidden />
        </IconButton>
      )}
    </div>
  );

  const menuTrigger = (
    <IconButton
      aria-label="Menu do painel"
      aria-expanded={navMenuOpen}
      data-tour="admin-mobile-menu-trigger admin-desktop-more-menu"
      size={ADMIN_TOOLBAR_ICON_SIZE}
      className={ADMIN_TOOLBAR_ICON_CLASS}
      onClick={() => setNavMenuOpen(true)}
    >
      <Menu className={ADMIN_TOOLBAR_GLYPH} strokeWidth={2} aria-hidden />
    </IconButton>
  );

  const syncChipHeader = (
    <SyncChip
      isSyncing={isSyncing}
      syncDataStale={syncDataStale}
      syncLabel={syncLabel}
      onRefresh={onRefresh}
      loading={loading}
      dataTour="admin-refresh"
      className="shrink-0"
    />
  );

  if (layout === "dashboard") {
    return (
      <>
        <header
          className="safe-top relative z-30 shrink-0 border-b-2 border-border-strong bg-card text-card-foreground"
          data-tour="admin-home-dashboard-header"
        >
          <div className={adminFullBleedShell.headerInner}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border-strong bg-muted">
                  <LayoutDashboard className={ADMIN_TOOLBAR_GLYPH} strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0">
                  <DisplayHeading as="h1" lines={["Painel operacional"]} className="text-lg md:text-xl" />
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    Medidas, instalações, reparações e restantes serviços — pipeline e atalhos.
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {userName || "Operador"} · {opportunitiesCount} serviços no mapa
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                {syncChipHeader}
                {searchTrigger}
                {notificationBell}
                {menuTrigger}
              </div>
            </div>
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
              <h1
                className="max-w-[4.5rem] truncate text-xs font-bold leading-tight text-foreground min-[420px]:max-w-[7rem] sm:max-w-[10rem] sm:text-sm md:max-w-none"
                title={userName || undefined}
              >
                {userName || "Painel"}
              </h1>
              <p className="hidden truncate text-xs font-medium text-muted-foreground min-[420px]:block sm:block">
                {opportunitiesCount} serviços
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {syncChipHeader}
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
