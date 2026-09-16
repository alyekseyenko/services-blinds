"use client";
import React from "react";
import { LogOut, MapPin, MapPinOff, RefreshCw } from "lucide-react";

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
  const handleLogout = async () => {
    try {
      const storedId = userId || (typeof window !== "undefined" ? localStorage.getItem("userId") : null);
      if (storedId) {
        // Notificar o servidor para remover imediatamente a localização do mapa do Admin
        await fetch(`/api/location?technicianId=${encodeURIComponent(storedId)}`, { method: "DELETE" }).catch(() => {});
      }
    } catch {
      // Ignorar erros no logout
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="backdrop-blur-xl bg-white/70 border-b border-slate-200/80 p-5 shadow-sm flex justify-between items-center z-30 shrink-0">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 bg-[#121622] rounded-2xl flex items-center justify-center font-black text-[#84cc16] shadow-md text-lg uppercase rotate-3">
            <span>{userName ? userName.charAt(0) : "T"}</span>
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-4.5 h-4.4 border-2 border-white rounded-full ${
              isOnline
                ? "bg-[#84cc16] animate-pulse shadow-[0_0_8px_#84cc16]"
                : "bg-amber-500"
            }`}
          ></div>
        </div>
        <div>
          <h1 className="font-black text-[#090d16] leading-none tracking-tight text-lg uppercase italic">
            {userName || "Técnico"}
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
            ESTORESRAINHA Pro • {tasksCount} Tarefas
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {(pendingCount > 0 || failedCount > 0) && (
          <div className="flex items-center gap-1.5">
            {pendingCount > 0 && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1.5 rounded-xl">
                {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
              </span>
            )}
            {failedCount > 0 && onRetrySync && (
              <button
                onClick={onRetrySync}
                className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-300 px-2.5 py-1.5 rounded-xl hover:bg-red-200"
              >
                {failedCount} falhou — Retry
              </button>
            )}
          </div>
        )}

        {/* Botão de Controlo RGPD da Localização em tempo real */}
        {onToggleLocationConsent && (
          <button
            onClick={onToggleLocationConsent}
            className={`px-3 py-2.5 rounded-xl transition-all border flex items-center gap-1.5 shadow-sm text-xs font-black uppercase tracking-wider ${
              locationSharingEnabled
                ? "bg-[#84cc16]/10 text-[#65a30d] border-[#84cc16]/30 hover:bg-[#84cc16]/20"
                : "bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-600"
            }`}
            title={locationSharingEnabled ? "GPS Ativo (RGPD Autorizado). Clique para desligar." : "GPS Desligado. Clique para ativar partilha."}
          >
            {locationSharingEnabled ? (
              <>
                <MapPin className="w-4 h-4 text-[#84cc16] animate-bounce" />
                <span className="hidden md:inline">GPS Ativo</span>
              </>
            ) : (
              <>
                <MapPinOff className="w-4 h-4 text-slate-400" />
                <span className="hidden md:inline">GPS Pausado</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={mutateTasks}
          disabled={loading || isSyncing}
          className={`p-3 bg-white rounded-xl transition-all border border-slate-200 shadow-sm ${
            isSyncing
              ? "text-amber-500"
              : "text-slate-500 hover:text-[#84cc16] hover:border-[#84cc16]/20"
          }`}
          title="Sincronizar Tarefas"
        >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`} />
        </button>

        <button
          onClick={handleLogout}
          className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-500/20 rounded-xl transition-all shadow-sm"
          title="Terminar Sessão"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
