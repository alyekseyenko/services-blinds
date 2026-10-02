"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Bell, X } from "lucide-react";
import { useBackToClose } from "@/hooks/useBackToClose";
import {
  IN_APP_NOTIFICATIONS_UPDATED_EVENT,
  dispatchOpenTaskFromNotification,
  loadInAppNotifications,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
  type InAppNotification,
} from "@/lib/inAppNotifications";
import {
  type AgendaNotificationFilter,
  filterInAppNotifications,
  groupInAppNotificationsByDay,
} from "@/lib/agendaNotificationPanel";
import { IconButton } from "@/components/ui/IconButton";
import {
  AgendaVisitNotificationCard,
  ObservabilityNotificationCard,
} from "@/components/ui/AgendaVisitNotificationCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

interface InAppNotificationBellProps {
  scope: string;
  dataTour?: string;
  onOpenTaskOnMap?: (notification: InAppNotification) => void;
  onInvestigate?: (notification: InAppNotification) => void;
}

const FILTER_CHIPS: { id: AgendaNotificationFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Activas" },
  { id: "done", label: "Concluídas" },
  { id: "problems", label: "Com problemas" },
];

export default function InAppNotificationBell({
  scope,
  dataTour,
  onOpenTaskOnMap,
  onInvestigate,
}: InAppNotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [filter, setFilter] = useState<AgendaNotificationFilter>("all");
  const pendingActivateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) return;
    const pending = pendingActivateRef.current;
    if (!pending) return;
    pendingActivateRef.current = null;
    pending();
  }, [open]);

  const refresh = () => {
    if (!scope) {
      setItems([]);
      return;
    }
    setItems(loadInAppNotifications(scope));
  };

  useEffect(() => {
    if (!scope) return;
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.includes(scope)) refresh();
    };
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ scope?: string }>).detail;
      if (!detail?.scope || detail.scope === scope) refresh();
    };
    const onDayChange = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(IN_APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    window.addEventListener("focus", onDayChange);
    document.addEventListener("visibilitychange", onDayChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(IN_APP_NOTIFICATIONS_UPDATED_EVENT, onUpdated);
      window.removeEventListener("focus", onDayChange);
      document.removeEventListener("visibilitychange", onDayChange);
    };
  }, [scope]);

  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => refresh(), 60_000);
    return () => window.clearInterval(interval);
  }, [open, scope]);

  const isTechScope = scope.startsWith("tech_");
  const isAdminScope = scope.startsWith("admin_");
  const useAdminSidebar = isAdminScope;
  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const filteredItems = useMemo(
    () => filterInAppNotifications(items, filter),
    [items, filter]
  );
  const dayGroups = useMemo(
    () => groupInAppNotificationsByDay(filteredItems),
    [filteredItems]
  );

  const actionLabel = isAdminScope ? "Abrir no mapa" : isTechScope ? "Ver no mapa" : "Abrir";

  const dismissPanel = (markAllRead: boolean) => {
    if (markAllRead && scope && unreadCount > 0) {
      setItems(markAllInAppNotificationsRead(scope));
    }
    setOpen(false);
  };

  useBackToClose(open, () => dismissPanel(true), "in-app-notifications-panel");

  const runAfterOverlayDismiss = (action: () => void) => {
    pendingActivateRef.current = action;
    dismissPanel(false);
  };

  const handleActivate = (n: InAppNotification) => {
    markInAppNotificationRead(scope, n.id);
    setItems(loadInAppNotifications(scope));

    runAfterOverlayDismiss(() => {
      if (n.href) {
        router.push(n.href);
        return;
      }
      if (onInvestigate && (n.taskId || n.opportunityId)) {
        onInvestigate(n);
        return;
      }
      if (n.taskId && onOpenTaskOnMap) {
        onOpenTaskOnMap(n);
        return;
      }
      if (n.taskId) {
        dispatchOpenTaskFromNotification({
          taskId: n.taskId,
          dueAtIso: n.dueAtIso,
        });
      }
    });
  };

  const renderCard = (n: InAppNotification) => {
    if (n.notificationKind === "observability") {
      return (
        <ObservabilityNotificationCard
          notification={n}
          spacious={useAdminSidebar}
          onActivate={() => handleActivate(n)}
        />
      );
    }
    return (
      <AgendaVisitNotificationCard
        notification={n}
        spacious={useAdminSidebar}
        actionLabel={actionLabel}
        onActivate={() => handleActivate(n)}
      />
    );
  };

  const panelTitle = isTechScope ? "Avisos de hoje" : "Centro de avisos";
  const panelSubtitle = isAdminScope
    ? "Visitas e alterações recentes na agenda"
    : isTechScope
      ? "Alterações no seu dia"
      : "Avisos recentes";

  return (
    <div className="relative" data-tour={dataTour}>
      <IconButton
        aria-label={unreadCount > 0 ? `${unreadCount} avisos por ler` : "Avisos da agenda"}
        onClick={() => {
          setOpen((wasOpen) => {
            if (wasOpen) {
              dismissPanel(true);
              return false;
            }
            refresh();
            return true;
          });
        }}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="ds-badge-count absolute -right-1 -top-1 z-10"
            aria-hidden
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </IconButton>

      {open &&
        mounted &&
        createPortal(
          <>
            <button
              type="button"
              className={cn(
                "fixed inset-0 z-[70] bg-scrim ",
                useAdminSidebar ? "md:bg-scrim" : "md:bg-scrim"
              )}
              aria-label="Fechar avisos"
              onClick={() => dismissPanel(true)}
            />
            <div
              className={cn(
                "ds-surface-raised fixed z-[71] flex flex-col",
                useAdminSidebar
                  ? cn(
                      "inset-x-0 bottom-0 top-[max(3.25rem,calc(env(safe-area-inset-top)+2.75rem))] w-full max-w-none rounded-none border-x-0 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
                      "md:inset-y-0 md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[min(28rem,100vw)] md:rounded-none md:border-l md:border-t-0 md:px-0 md:pb-0 md:pt-0"
                    )
                  : cn(
                      "inset-x-0 bottom-0 w-full max-w-none rounded-none border-x-0 border-t",
                      "top-[max(3.25rem,calc(env(safe-area-inset-top)+2.75rem))]",
                      "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
                      "md:inset-x-auto md:bottom-auto md:w-[min(22rem,calc(100vw-2rem))] md:rounded-2xl md:border md:p-3",
                      "md:top-[max(4.25rem,calc(env(safe-area-inset-top)+3.25rem))]",
                      isTechScope
                        ? "md:left-1/2 md:right-auto md:-translate-x-1/2"
                        : "md:right-4 md:left-auto lg:right-6"
                    )
              )}
              role="dialog"
              aria-label={panelTitle}
            >
              <div
                className={cn(
                  "flex shrink-0 flex-col gap-3 border-b border-border dark:border-border",
                  useAdminSidebar ? "px-5 py-4 md:px-6 md:py-5" : "mb-2 px-0 pb-2"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "font-black uppercase tracking-wider text-foreground dark:text-foreground",
                        useAdminSidebar ? "text-sm" : "text-xs text-muted-foreground"
                      )}
                    >
                      {panelTitle}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
                      {panelSubtitle}
                      {unreadCount > 0 ? ` · ${unreadCount} por ler` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissPanel(true)}
                    className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-muted dark:text-muted-foreground md:min-h-11 md:min-w-11"
                    aria-label="Fechar avisos"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                </div>

                <SegmentedControl
                  aria-label="Filtrar avisos"
                  value={filter}
                  onChange={setFilter}
                  options={FILTER_CHIPS.map((chip) => ({
                    value: chip.id,
                    label: chip.label,
                  }))}
                />

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setItems(markAllInAppNotificationsRead(scope))}
                    className="self-start text-xs font-bold text-info-fg"
                  >
                    Marcar tudo como lido
                  </button>
                )}
              </div>

              {filteredItems.length === 0 ? (
                <p
                  className={cn(
                    "font-semibold text-muted-foreground dark:text-muted-foreground",
                    useAdminSidebar ? "px-6 py-8 text-sm" : "px-0 py-4 text-xs"
                  )}
                >
                  {items.length === 0 ? "Sem avisos novos." : "Nenhum aviso neste filtro."}
                </p>
              ) : (
                <ul
                  className={cn(
                    "min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain custom-scrollbar",
                    useAdminSidebar ? "px-4 py-4 md:px-5 md:py-5" : "max-md:pb-1 md:max-h-[min(20rem,55vh)]"
                  )}
                >
                  {dayGroups.map((group) => (
                    <li key={group.id} className="list-none space-y-3">
                      <p
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground dark:text-muted-foreground"
                        role="presentation"
                      >
                        {group.label}
                      </p>
                      <ul className="space-y-3">
                        {group.items.map((n) => (
                          <li key={n.id}>{renderCard(n)}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
