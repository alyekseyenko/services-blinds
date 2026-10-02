"use client";

import React, { useEffect, useRef, useState } from "react";
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
  MoreHorizontal,
  Bell,
  HelpCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { signOutToAppLogin } from "@/lib/clientSignOut";
import {
  canAccessCeoPanel,
  isStrictAdminRole,
  resolveWorkspaceMemberId,
  type AppSessionUser,
} from "@/lib/auth/session";
import type { AppRole } from "@/lib/schemas/auth";
import { APP_LOGO_PATH } from "@/lib/branding";
import { clearSessionStoragePreservingPreferences } from "@/lib/clientPreferences";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import TourHelpButton from "@/components/onboarding/TourHelpButton";
import { requestTourChapterPicker } from "@/lib/onboarding/requestTourChapterPicker";
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

interface AdminHeaderProps {
  opportunitiesCount: number;
  lastSync: Date | null;
  syncDataStale?: boolean;
  loading: boolean;
  isSyncing: boolean;
  router: { push: (path: string) => void };
  onRefresh: () => void;
  onOpenSearch?: () => void;
  userName: string;
  view: string;
  setView: (v: string) => void;
  onInvestigateAgendaNotification?: (notification: InAppNotification) => void;
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
  userName,
  view,
  setView,
  onInvestigateAgendaNotification,
}: AdminHeaderProps) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: AppRole } | undefined)?.role;
  const memberId = resolveWorkspaceMemberId(session?.user as AppSessionUser | undefined);
  const notificationScope = memberId ? getNotificationScope("admin", memberId) : "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  useBackToClose(mobileMenuOpen, () => setMobileMenuOpen(false), "admin-mobile-menu");
  useBackToClose(desktopMenuOpen, () => setDesktopMenuOpen(false), "admin-desktop-menu");
  const [mounted, setMounted] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const desktopMoreAnchorRef = useRef<HTMLDivElement>(null);
  const [desktopMenuLayout, setDesktopMenuLayout] = useState<{
    top: number;
    right: number;
    maxHeight: number;
  } | null>(null);

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
          if (!isDesktop) setMobileMenuOpen(true);
          break;
        case "closeAdminMobileMenu":
          setMobileMenuOpen(false);
          break;
        case "openAdminDesktopMenu":
          if (isDesktop) setDesktopMenuOpen(true);
          break;
        case "closeAdminDesktopMenu":
          setDesktopMenuOpen(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourAction);
    return () => window.removeEventListener(ONBOARDING_TOUR_ACTION_EVENT, onTourAction);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!desktopMenuOpen) {
      setDesktopMenuLayout(null);
      return;
    }
    const updateLayout = () => {
      const anchor = desktopMoreAnchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const top = rect.bottom + 8;
      const right = Math.max(8, window.innerWidth - rect.right);
      const maxHeight = Math.max(180, window.innerHeight - top - 12);
      setDesktopMenuLayout({ top, right, maxHeight });
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);
    return () => {
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
    };
  }, [desktopMenuOpen]);

  useEffect(() => {
    if (!desktopMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (desktopMenuRef.current?.contains(target)) return;
      if (desktopMoreAnchorRef.current?.contains(target)) return;
      setDesktopMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [desktopMenuOpen]);

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
      <div className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-muted">
        <span className="text-sm font-semibold text-foreground">Tema</span>
        <ThemeToggle />
      </div>
      {session && userRole && canAccessCeoPanel(userRole) && (
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            setDesktopMenuOpen(false);
            router.push("/ceo");
          }}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-foreground hover:bg-muted"
          data-tour="admin-menu-ceo"
        >
          <TrendingUp className="h-5 w-5 shrink-0 text-primary-ink" aria-hidden />
          Painel CEO
        </button>
      )}
      {session && userRole && isStrictAdminRole(userRole) && (
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            setDesktopMenuOpen(false);
            router.push("/admin/observabilidade");
          }}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-ink px-3 text-left text-sm font-semibold text-primary hover:bg-ink/90"
          data-tour="admin-menu-sre"
        >
          <Activity className="h-5 w-5 shrink-0" aria-hidden />
          Consola SRE
        </button>
      )}
      <button
        type="button"
        onClick={async () => {
          setMobileMenuOpen(false);
          setDesktopMenuOpen(false);
          clearSessionStoragePreservingPreferences();
          await signOutToAppLogin();
        }}
        className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-danger-border bg-danger-surface text-sm font-bold text-danger-fg"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        Terminar sessão
      </button>
    </>
  );

  const mobileSheet =
    mobileMenuOpen && mounted
      ? createPortal(
          <div
            className="admin-header-mobile-sheet fixed inset-0 z-[200] flex flex-col justify-end bg-scrim md:hidden"
            role="presentation"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              ref={mobileMenuRef}
              data-tour="admin-mobile-menu-sheet"
              className="safe-bottom max-h-[85dvh] overflow-y-auto rounded-t-3xl border-2 border-primary/30 bg-card p-5 shadow-2xl"
              role="dialog"
              aria-label="Menu do administrador"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">Menu do painel</p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Vistas, pesquisa, sync, guia e conta — tudo aqui no telemóvel.
                  </p>
                </div>
                <IconButton
                  aria-label="Fechar menu"
                  variant="ghost"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </IconButton>
              </div>
              <div className="flex flex-col gap-1">
                <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Vistas
                </p>
                <div className="mb-3 flex justify-center" data-tour="admin-views-mobile">
                  <AdminPrimaryNav
                    view={view}
                    setView={(v) => {
                      setView(v);
                      setMobileMenuOpen(false);
                    }}
                  />
                </div>
                <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ações
                </p>
                {onOpenSearch && (
                  <button
                    type="button"
                    data-tour="admin-search"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenSearch();
                    }}
                    className="mb-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    <Search className="h-5 w-5 shrink-0 text-primary-ink" aria-hidden />
                    Pesquisar serviços
                  </button>
                )}
                <SyncChip
                  isSyncing={isSyncing}
                  syncDataStale={syncDataStale}
                  syncLabel={syncLabel}
                  onRefresh={onRefresh}
                  loading={loading}
                  dataTour="admin-refresh"
                  className="mb-3 w-full max-w-none justify-start"
                />
                <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ajuda
                </p>
                <button
                  type="button"
                  data-tour="tour-help-button"
                  onClick={() => requestTourChapterPicker()}
                  className="mb-2 flex min-h-12 w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-muted"
                >
                  <span className="text-sm font-semibold text-foreground">Guia da app</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
                    <HelpCircle className="h-5 w-5 text-foreground" aria-hidden />
                  </span>
                </button>
                <p className="px-1 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Conta
                </p>
                {accountMenuItems}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const desktopMenuPanel = (
    <>
      <p className="mb-2 px-2 text-xs font-medium leading-relaxed text-muted-foreground">
        Mais opções: repetir o guia, tema claro/escuro, painel CEO (se tiver acesso) e terminar sessão.
      </p>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => requestTourChapterPicker()}
          className="mb-1 flex min-h-12 w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-muted"
        >
          <span className="text-sm font-semibold text-foreground">Guia da app</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
            <HelpCircle className="h-5 w-5 text-foreground" aria-hidden />
          </span>
        </button>
        {accountMenuItems}
      </div>
    </>
  );

  const desktopMenuPortal =
    desktopMenuOpen && mounted && desktopMenuLayout
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[240] hidden bg-transparent md:block"
              aria-label="Fechar menu"
              onClick={() => setDesktopMenuOpen(false)}
            />
            <div
              ref={desktopMenuRef}
              className="admin-header-desktop-menu fixed z-[250] hidden w-[min(100vw-2rem,20rem)] overflow-y-auto overscroll-contain rounded-2xl border-2 border-primary/30 bg-card p-3 shadow-xl md:block"
              data-tour="admin-desktop-menu-panel"
              role="dialog"
              aria-label="Mais opções"
              style={{
                top: desktopMenuLayout.top,
                right: desktopMenuLayout.right,
                maxHeight: desktopMenuLayout.maxHeight,
              }}
            >
              {desktopMenuPanel}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <header className="safe-top relative z-30 shrink-0 border-b-2 border-border-strong bg-card text-card-foreground">
        <div className="mx-auto grid w-full max-w-[100rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
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

          <nav
            className="hidden justify-center px-0.5 md:flex"
            aria-label="Vistas do painel"
            data-tour="admin-views"
          >
            <AdminPrimaryNav view={view} setView={setView} />
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
            {onOpenSearch && (
              <IconButton
                aria-label="Pesquisar serviços"
                data-tour="admin-search"
                onClick={onOpenSearch}
                className="hidden md:inline-flex md:min-h-11 md:min-w-11"
              >
                <Search className="h-5 w-5" />
              </IconButton>
            )}

            <div className="hidden md:block">
              <SyncChip
                isSyncing={isSyncing}
                syncDataStale={syncDataStale}
                syncLabel={syncLabel}
                onRefresh={onRefresh}
                loading={loading}
                dataTour="admin-refresh"
              />
            </div>

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

            <div className="hidden md:block">
              <TourHelpButton className="h-11 w-11 min-h-11 min-w-11" label="Guias da app" />
            </div>

            <div className="relative hidden md:block" ref={desktopMoreAnchorRef}>
              <IconButton
                aria-label="Mais opções"
                aria-expanded={desktopMenuOpen}
                data-tour="admin-desktop-more-menu"
                variant="ghost"
                className="min-h-11 min-w-11 border border-border"
                onClick={() => setDesktopMenuOpen((o) => !o)}
              >
                <MoreHorizontal className="h-5 w-5" />
              </IconButton>
            </div>

            <div className="md:hidden" data-tour="admin-views">
              <AdminPrimaryNav view={view} setView={setView} />
            </div>

            <IconButton
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
              data-tour="admin-mobile-menu-trigger"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </IconButton>
          </div>
        </div>
      </header>
      {mobileSheet}
      {desktopMenuPortal}
    </>
  );
}
