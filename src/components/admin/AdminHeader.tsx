"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Menu, Search, Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { isStrictAdminRole, resolveWorkspaceMemberId, type AppSessionUser } from "@/lib/auth/session";
import type { AppRole } from "@/lib/schemas/auth";
import { APP_LOGO_PATH } from "@/lib/branding";
import InAppNotificationBell from "@/components/ui/InAppNotificationBell";
import { getNotificationScope, type InAppNotification } from "@/lib/inAppNotifications";
import {
  ADMIN_PRIMARY_NAV_ITEMS,
  type AdminViewId,
} from "@/components/admin/AdminPrimaryNav";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { formatSyncAgeLabel } from "@/lib/formatSyncAge";
import { useBackToClose } from "@/hooks/useBackToClose";
import { AdminSyncChip } from "@/components/admin/header/AdminSyncChip";
import { AdminNavMenuSheet } from "@/components/admin/header/AdminNavMenuSheet";
import {
  ADMIN_TOOLBAR_GLYPH,
  ADMIN_TOOLBAR_ICON_CLASS,
  ADMIN_TOOLBAR_ICON_SIZE,
} from "@/components/admin/header/adminHeaderToolbar";
import { DesktopNotificationPrompt } from "@/components/ui/DesktopNotificationPrompt";

export interface AdminHeaderProps {
  opportunitiesCount: number;
  lastSync: Date | null;
  syncDataStale?: boolean;
  loading: boolean;
  isSyncing: boolean;
  router: { push: (path: string) => void };
  onRefresh: () => void;
  onLoadMapServices?: () => void;
  onOpenSearch?: () => void;
  onOpenCreateService?: () => void;
  onOpenCreateClient?: () => void;
  userName: string;
  view: string;
  setView: (v: string) => void;
  onInvestigateAgendaNotification?: (notification: InAppNotification) => void;
  layout?: "toolbar" | "dashboard";
}

const ADMIN_VIEW_LABELS: Record<AdminViewId, string> = {
  home: "Início",
  map: "Mapa",
  calendar: "Agenda",
  history: "Histórico",
};

export default function AdminHeader({
  opportunitiesCount,
  lastSync,
  syncDataStale = false,
  loading,
  isSyncing,
  router,
  onRefresh,
  onLoadMapServices,
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

  const viewTitle =
    ADMIN_VIEW_LABELS[view as AdminViewId] ?? (layout === "dashboard" ? "Início" : "Painel");

  const menuNeedsAttention = isSyncing || syncDataStale;

  return (
    <>
      <header
        className="safe-top relative z-30 shrink-0 border-b-2 border-border-strong bg-card text-card-foreground"
        data-tour={layout === "dashboard" ? "admin-home-dashboard-header" : undefined}
      >
        <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-2 px-3 py-2.5 sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:gap-3">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 lg:contents">
            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5 lg:shrink-0">
              <div className="relative shrink-0">
                <Image
                  src={APP_LOGO_PATH}
                  alt=""
                  width={36}
                  height={36}
                  priority
                  className="h-9 w-9 object-contain"
                />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                    isSyncing ? "bg-warning-solid" : syncDataStale ? "bg-danger-solid" : "bg-primary"
                  )}
                  aria-hidden
                />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight text-foreground sm:text-base">
                  {viewTitle}
                </h1>
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {opportunitiesCount} serviços
                  <span className="hidden sm:inline"> · {userName || "Operador"}</span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5 lg:order-last">
              <AdminSyncChip
                isSyncing={isSyncing}
                syncDataStale={syncDataStale}
                syncLabel={syncLabel}
                onRefresh={onRefresh}
                onLoadMapServices={onLoadMapServices}
                loading={loading}
                dataTour="admin-refresh"
                className="hidden shrink-0 md:flex"
              />
              {onOpenSearch ? (
                <IconButton
                  aria-label="Pesquisar serviços"
                  data-tour="admin-search admin-search-header"
                  size={ADMIN_TOOLBAR_ICON_SIZE}
                  className={ADMIN_TOOLBAR_ICON_CLASS}
                  onClick={onOpenSearch}
                >
                  <Search className={ADMIN_TOOLBAR_GLYPH} strokeWidth={2} aria-hidden />
                </IconButton>
              ) : null}
              <div className="relative shrink-0" data-tour="admin-header-notifications">
                {notificationScope ? (
                  <InAppNotificationBell
                    scope={notificationScope}
                    onInvestigate={onInvestigateAgendaNotification}
                    showSystemAlerts={Boolean(userRole && isStrictAdminRole(userRole))}
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
              <span className="relative inline-flex shrink-0">
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
                {menuNeedsAttention ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                      isSyncing ? "bg-warning-solid" : "bg-danger-solid"
                    )}
                    aria-hidden
                  />
                ) : null}
              </span>
            </div>
          </div>

          <div
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
            data-tour="admin-views-desktop"
          >
            {ADMIN_PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-tour={`admin-nav-${item.id}`}
                  onClick={() => setView(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  title={item.label}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-xl border-2 px-3 text-xs font-bold transition-all active:scale-[0.99]",
                    isActive
                      ? "border-border-strong bg-neon text-neon-foreground"
                      : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>
      {notificationScope ? (
        <DesktopNotificationPrompt
          scope={notificationScope}
          className="mx-auto w-full max-w-[100rem] border-x-0 border-t-0 px-3 sm:px-4"
        />
      ) : null}
      <AdminNavMenuSheet
        open={navMenuOpen}
        mounted={mounted}
        navMenuRef={navMenuRef}
        onClose={closeNavMenu}
        dismissForNavigation={dismissNavMenuForNavigation}
        isSyncing={isSyncing}
        syncDataStale={syncDataStale}
        syncLabel={syncLabel}
        onRefresh={onRefresh}
        onLoadMapServices={onLoadMapServices}
        loading={loading}
        view={view}
        selectViewFromMenu={selectViewFromMenu}
        session={session ?? null}
        userRole={userRole}
        onOpenCreateClient={onOpenCreateClient}
        onOpenCreateService={onOpenCreateService}
        openOverlayFromMenu={openOverlayFromMenu}
        navigateFromAdminMenu={navigateFromAdminMenu}
      />
    </>
  );
}