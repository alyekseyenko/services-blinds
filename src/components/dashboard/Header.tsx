"use client";
import React, { useState } from "react";
import Image from "next/image";
import { LogOut, MapPin, MapPinOff, MoreVertical, RefreshCw, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/badge";
import SyncQueueSheet from "@/components/dashboard/SyncQueueSheet";
import { APP_LOGO_PATH, APP_SHORT_NAME } from "@/lib/branding";
import { clearSessionStoragePreservingPreferences } from "@/lib/clientPreferences";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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
}

export default function Header({
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
}: HeaderProps) {
  const [queueOpen, setQueueOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
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
    clearSessionStoragePreservingPreferences();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <>
      <header className="safe-top z-30 shrink-0 border-b border-border bg-card/90 text-card-foreground shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[100rem] items-center justify-between gap-2 p-3 md:gap-3 md:p-5">
          <div className="flex min-w-0 items-center gap-2.5 md:gap-4">
            <div className="relative shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card shadow-md ring-1 ring-border md:h-12 md:w-12">
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
                  isOnline ? "bg-[#84cc16] shadow-[0_0_8px_#84cc16]" : "bg-amber-500"
                }`}
                aria-label={isOnline ? "Online" : "Offline"}
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black uppercase italic leading-none tracking-tight text-foreground md:text-lg">
                {userName || "Técnico"}
              </h1>
              <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
                {APP_SHORT_NAME} · {tasksCount} tarefa{tasksCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {(pendingCount > 0 || failedCount > 0) && (
              <button
                type="button"
                onClick={() => setQueueOpen(true)}
                className="flex min-h-11 items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5 shadow-sm md:min-h-12 md:px-3"
                aria-label="Abrir fila de sincronização"
              >
                {pendingCount > 0 && (
                  <Badge variant="warning">{pendingCount}</Badge>
                )}
                {failedCount > 0 && <Badge variant="error">{failedCount}</Badge>}
              </button>
            )}

            <div className="hidden items-center gap-2 md:flex">
              {onToggleLocationConsent && (
                <IconButton
                  onClick={onToggleLocationConsent}
                  aria-label={
                    locationSharingEnabled
                      ? "GPS ativo — clique para pausar"
                      : "GPS pausado — clique para ativar"
                  }
                  className={
                    locationSharingEnabled
                      ? "border-[#84cc16]/30 bg-[#84cc16]/10 text-[#65a30d]"
                      : "text-muted-foreground"
                  }
                >
                  {locationSharingEnabled ? (
                    <MapPin className="h-5 w-5 text-[#84cc16]" />
                  ) : (
                    <MapPinOff className="h-5 w-5" />
                  )}
                </IconButton>
              )}

              <IconButton
                onClick={mutateTasks}
                disabled={loading || isSyncing}
                aria-label="Sincronizar tarefas"
                className={isSyncing ? "text-amber-500" : ""}
              >
                <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin" : ""}`} />
              </IconButton>

              <ThemeToggle />

              <IconButton onClick={handleLogout} aria-label="Terminar sessão" variant="danger">
                <LogOut className="h-5 w-5" />
              </IconButton>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card text-foreground md:hidden"
              aria-label="Mais opções"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[80] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm md:hidden"
          role="presentation"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="safe-bottom rounded-t-3xl border border-border bg-card p-4 shadow-2xl"
            role="dialog"
            aria-label="Ações rápidas"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-tight text-foreground">Ações</p>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {onToggleLocationConsent && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleLocationConsent();
                    setMobileMenuOpen(false);
                  }}
                  className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-muted/50 px-2 text-xs font-bold text-foreground"
                >
                  {locationSharingEnabled ? (
                    <MapPin className="h-5 w-5 text-[#84cc16]" />
                  ) : (
                    <MapPinOff className="h-5 w-5" />
                  )}
                  GPS
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  mutateTasks();
                  setMobileMenuOpen(false);
                }}
                disabled={loading || isSyncing}
                className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-muted/50 px-2 text-xs font-bold text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin" : ""}`} />
                Sincronizar
              </button>
              <div className="flex min-h-12 items-center justify-center rounded-xl border border-border bg-muted/50">
                <ThemeToggle showLabel className="border-0 bg-transparent shadow-none" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleLogout();
                }}
                className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      <SyncQueueSheet
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        pendingCount={pendingCount}
        failedCount={failedCount}
        onRetry={() => {
          onRetrySync?.();
          setQueueOpen(false);
        }}
      />
    </>
  );
}
