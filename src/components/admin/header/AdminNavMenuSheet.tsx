"use client";

import type { RefObject } from "react";
import { createPortal } from "react-dom";
import {
  LogOut,
  Activity,
  TrendingUp,
  X,
  Ruler,
  LayoutDashboard,
  ClipboardPlus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { Session } from "next-auth";
import { signOutToAppLogin } from "@/lib/clientSignOut";
import {
  canAccessAdminPanel,
  canAccessCeoPanel,
  isStrictAdminRole,
} from "@/lib/auth/session";
import type { AppRole } from "@/lib/schemas/auth";
import { clearSessionStoragePreservingPreferences } from "@/lib/clientPreferences";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FeedbackCuePreferences } from "@/components/ui/FeedbackCuePreferences";
import { AdminPrimaryNav } from "@/components/admin/AdminPrimaryNav";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { AdminSyncChip } from "@/components/admin/header/AdminSyncChip";
import {
  ADMIN_MENU_ITEM_CLASS,
  ADMIN_TOOLBAR_GLYPH,
} from "@/components/admin/header/adminHeaderToolbar";

export function AdminPanelMenuItem({
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

export function AdminNavMenuSheet(props: {
  open: boolean;
  mounted: boolean;
  navMenuRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  dismissForNavigation: () => void;
  isSyncing: boolean;
  syncDataStale: boolean;
  syncLabel: string;
  onRefresh: () => void;
  onLoadMapServices?: () => void;
  loading: boolean;
  view: string;
  selectViewFromMenu: (next: string) => void;
  session: Session | null;
  userRole: AppRole | undefined;
  onOpenCreateClient?: () => void;
  onOpenCreateService?: () => void;
  openOverlayFromMenu: (action: () => void) => void;
  navigateFromAdminMenu: (path: string) => void;
}) {
  const {
    open,
    mounted,
    navMenuRef,
    onClose,
    dismissForNavigation,
    isSyncing,
    syncDataStale,
    syncLabel,
    onRefresh,
    onLoadMapServices,
    loading,
    view,
    selectViewFromMenu,
    session,
    userRole,
    onOpenCreateClient,
    onOpenCreateService,
    openOverlayFromMenu,
    navigateFromAdminMenu,
  } = props;

  if (!open || !mounted) return null;

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
          dismissForNavigation();
          clearSessionStoragePreservingPreferences();
          await signOutToAppLogin();
        }}
      />
    </>
  );

  return createPortal(
    <div
      className="admin-header-mobile-sheet fixed inset-0 z-[200] flex items-stretch bg-scrim md:justify-end"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={navMenuRef}
        data-tour="admin-mobile-menu-sheet"
        className="safe-top safe-bottom flex h-full max-h-dvh w-full flex-col gap-4 overflow-y-auto border-2 border-border-strong bg-card p-4 sm:max-w-sm sm:rounded-none sm:rounded-l-2xl sm:border-r-0 sm:p-5"
        role="dialog"
        aria-label="Menu do painel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-foreground">Menu do painel</p>
            <p className="text-xs font-semibold text-muted-foreground">
              Sincronização, vistas, operações e conta.
            </p>
          </div>
          <IconButton aria-label="Fechar menu" variant="ghost" onClick={onClose}>
            <X className={ADMIN_TOOLBAR_GLYPH} strokeWidth={2} aria-hidden />
          </IconButton>
        </div>

        <section className="space-y-2 md:hidden">
          <p className="ds-kicker px-0.5">Sincronização</p>
          <AdminSyncChip
            isSyncing={isSyncing}
            syncDataStale={syncDataStale}
            syncLabel={syncLabel}
            onRefresh={onRefresh}
            onLoadMapServices={onLoadMapServices}
            loading={loading}
            dataTour="admin-refresh"
            fullWidth
          />
        </section>

        <section className="space-y-2 rounded-xl border-2 border-border bg-muted/30 p-3 lg:hidden">
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
          <p className="ds-kicker px-0.5">Preferências</p>
          <FeedbackCuePreferences layout="admin-rows" />
        </section>

        <section className="space-y-2">
          <p className="ds-kicker px-0.5">Conta</p>
          <div className="flex flex-col gap-2">{accountMenuItems}</div>
        </section>
      </div>
    </div>,
    document.body
  );
}