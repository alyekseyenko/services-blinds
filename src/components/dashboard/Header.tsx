"use client";
import React, { useState } from "react";
import Image from "next/image";
import { LogOut, MapPin, MapPinOff, RefreshCw } from "lucide-react";
import { signOut } from "next-auth/react";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/badge";
import SyncQueueSheet from "@/components/dashboard/SyncQueueSheet";
import { APP_LOGO_PATH, APP_SHORT_NAME } from "@/lib/branding";

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

  const handleLogout = async () => {
    try {
      const storedId = userId || (typeof window !== "undefined" ? localStorage.getItem("userId") : null);
      if (storedId) {
        await fetch(`/api/location?technicianId=${encodeURIComponent(storedId)}`, { method: "DELETE" }).catch(() => {});
      }
    } catch {
      // Ignore logout cleanup errors
    }
    localStorage.clear();
    sessionStorage.clear();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <>
      <header className="safe-top z-30 flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200">
              <Image
                src={APP_LOGO_PATH}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
            </div>
            <div
              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                isOnline ? "bg-[#84cc16] shadow-[0_0_8px_#84cc16]" : "bg-amber-500"
              }`}
              aria-label={isOnline ? "Online" : "Offline"}
            />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase italic leading-none tracking-tight text-[#090d16]">
              {userName || "Técnico"}
            </h1>
            <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-600">
              {APP_SHORT_NAME} • {tasksCount} Tarefas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {(pendingCount > 0 || failedCount > 0) && (
            <button
              type="button"
              onClick={() => setQueueOpen(true)}
              className="flex min-h-12 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-colors hover:border-[#84cc16]/30"
              aria-label="Abrir fila de sincronização"
            >
              {pendingCount > 0 && (
                <Badge variant="warning">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</Badge>
              )}
              {failedCount > 0 && <Badge variant="error">{failedCount} falhou</Badge>}
            </button>
          )}

          {onToggleLocationConsent && (
            <IconButton
              onClick={onToggleLocationConsent}
              aria-label={locationSharingEnabled ? "GPS ativo — clique para pausar" : "GPS pausado — clique para ativar"}
              className={
                locationSharingEnabled
                  ? "border-[#84cc16]/30 bg-[#84cc16]/10 text-[#65a30d]"
                  : "text-slate-500"
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

          <IconButton onClick={handleLogout} aria-label="Terminar sessão" variant="danger">
            <LogOut className="h-5 w-5" />
          </IconButton>
        </div>
      </header>

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
