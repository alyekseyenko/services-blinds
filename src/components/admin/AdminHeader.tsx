import React, { useState } from 'react';
import Image from 'next/image';
import {
  LogOut,
  RefreshCw,
  Map as MapIcon,
  Calendar as CalendarIcon,
  History,
  Activity,
  TrendingUp,
  MoreVertical,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { canAccessCeoPanel, isStrictAdminRole } from "@/lib/auth/session";
import type { AppRole } from "@/lib/schemas/auth";
import { APP_LOGO_PATH } from "@/lib/branding";
import { clearSessionStoragePreservingPreferences } from "@/lib/clientPreferences";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface AdminHeaderProps {
  opportunitiesCount: number;
  lastSync: Date | null;
  loading: boolean;
  isSyncing: boolean;
  router: any;
  onRefresh: () => void;
  userName: string;
  view: string;
  setView: (v: string) => void;
}

export default function AdminHeader({
  opportunitiesCount,
  lastSync,
  loading,
  isSyncing,
  router,
  onRefresh,
  userName,
  view,
  setView,
}: AdminHeaderProps) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: AppRole } | undefined)?.role;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const syncLabel = lastSync ? lastSync.toLocaleTimeString("pt-PT") : "Sincronizando...";

  return (
    <div
      className="safe-top relative z-30 flex shrink-0 flex-col items-center justify-between gap-3 border-b border-border bg-card/95 p-3 text-card-foreground shadow-sm backdrop-blur-xl md:flex-row md:gap-4 md:p-4"
    >
      <div className="flex w-full items-center justify-between gap-4 md:w-auto">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center group">
              <Image
                src={APP_LOGO_PATH}
                alt="Logótipo da empresa"
                width={40}
                height={40}
                className="h-10 w-10 object-contain transition-transform group-hover:scale-105 drop-shadow-sm"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-lime-500" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase italic leading-none tracking-tighter text-foreground">
              {userName ? userName : "Administrador"}
            </h1>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-ping rounded-full bg-lime-500" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-600">
                {opportunitiesCount} Serviços Ativos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || isSyncing}
            aria-label="Sincronizar CRM"
            className={`flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-xl transition-all ${
              isSyncing ? "bg-amber-50 text-amber-500" : "bg-slate-50 text-slate-500"
            }`}
          >
            <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Mais opções"
            className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="hidden w-full max-w-md gap-1 rounded-2xl border border-slate-200/80 bg-slate-100 p-1.5 shadow-inner lg:flex lg:w-auto">
        <button
          type="button"
          onClick={() => setView("map")}
          className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all lg:flex-none ${
            view === "map"
              ? "border border-slate-200 bg-white text-lime-600 shadow-md"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <MapIcon className="h-3.5 w-3.5" /> Mapa
        </button>
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all lg:flex-none ${
            view === "calendar"
              ? "border border-slate-200 bg-white text-lime-600 shadow-md"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <CalendarIcon className="h-3.5 w-3.5" /> Agenda
        </button>
        <button
          type="button"
          onClick={() => setView("history")}
          className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all lg:flex-none ${
            view === "history"
              ? "border border-slate-200 bg-white text-lime-600 shadow-md"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="h-3.5 w-3.5" /> Histórico
        </button>
      </div>

      <div className="hidden items-center gap-2 lg:flex lg:ml-auto">
        <div className="mr-3 flex flex-col items-end">
          <p className="mb-1 text-xs font-black uppercase leading-none tracking-widest text-slate-600">
            CRM Sync
          </p>
          <p
            className={`text-xs font-black tracking-wider transition-colors ${
              isSyncing ? "text-amber-500" : "text-lime-600"
            }`}
          >
            {syncLabel}
          </p>
        </div>

        <ThemeToggle />

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || isSyncing}
          className={`rounded-xl border border-slate-200 p-3 transition-all ${
            isSyncing
              ? "bg-amber-50 text-amber-500"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
          title="Sincronizar CRM"
          aria-label="Sincronizar CRM"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        </button>

        {session && userRole && canAccessCeoPanel(userRole) && (
          <button
            type="button"
            onClick={() => router.push("/ceo")}
            className="flex animate-in fade-in items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-sm transition-all hover:border-lime-500/50 hover:bg-slate-50"
            title="Painel Executivo do CEO"
            aria-label="Painel CEO"
          >
            <TrendingUp className="h-4 w-4 text-lime-600" />
            <span className="hidden text-xs font-black uppercase tracking-widest lg:inline">
              Painel CEO
            </span>
          </button>
        )}

        {session && userRole && isStrictAdminRole(userRole) && (
          <button
            type="button"
            onClick={() => router.push("/admin/observabilidade")}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-lime-400 shadow-sm transition-all hover:border-lime-500/50 hover:bg-slate-800"
            title="Consola de Observabilidade e SRE"
            aria-label="Consola SRE"
          >
            <Activity className="h-4 w-4 animate-pulse text-lime-400" />
            <span className="hidden text-xs font-black uppercase tracking-widest lg:inline">
              SRE Console
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={async () => {
            clearSessionStoragePreservingPreferences();
            await signOut({ callbackUrl: "/" });
          }}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          aria-label="Terminar sessão"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm lg:hidden"
          role="presentation"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="safe-bottom rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl"
            role="dialog"
            aria-label="Menu do administrador"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-tight text-slate-900">Menu</p>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs font-semibold text-slate-600">
              Última sincronização:{" "}
              <span className="font-black text-slate-900">{syncLabel}</span>
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="text-xs font-bold text-slate-700">Tema</span>
                <ThemeToggle />
              </div>
              {session && userRole && canAccessCeoPanel(userRole) && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/ceo");
                  }}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 text-left text-sm font-bold text-slate-800"
                >
                  <TrendingUp className="h-5 w-5 text-lime-600" />
                  Painel CEO
                </button>
              )}
              {session && userRole && isStrictAdminRole(userRole) && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/admin/observabilidade");
                  }}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 text-left text-sm font-bold text-lime-400"
                >
                  <Activity className="h-5 w-5" />
                  Consola SRE
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  clearSessionStoragePreservingPreferences();
                  await signOut({ callbackUrl: "/" });
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-sm font-black text-red-700"
              >
                <LogOut className="h-5 w-5" />
                Terminar sessão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
