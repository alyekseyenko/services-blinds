import React from 'react';
import Image from 'next/image';
import { LogOut, ShieldCheck, RefreshCw, Filter, Map as MapIcon, Calendar as CalendarIcon, History, Activity, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";

interface AdminHeaderProps {
  opportunitiesCount: number;
  lastSync: Date | null;
  loading: boolean;
  isSyncing: boolean;
  isAdminMenuOpen: boolean;
  setIsAdminMenuOpen: (open: boolean) => void;
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
  isAdminMenuOpen, 
  setIsAdminMenuOpen, 
  router,
  onRefresh,
  userName,
  view,
  setView
}: AdminHeaderProps) {
  const { data: session } = useSession();
  return (
    <div className="bg-white/95 backdrop-blur-xl border-b border-slate-200 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center z-30 gap-4 shrink-0">
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 flex items-center justify-center group shrink-0">
              <Image 
                src="/favi_64.png" 
                alt="Company logo" 
                width={40} 
                height={40} 
                className="w-10 h-10 object-contain group-hover:scale-105 transition-transform drop-shadow-sm" 
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-lime-500 border-2 border-white rounded-full animate-pulse"></div>
          </div>
          <div>
            <h1 className="font-black text-slate-900 leading-none tracking-tighter text-sm uppercase italic">
              {userName ? userName : 'Administrador'}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
               <div className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-ping"></div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{opportunitiesCount} Serviços Ativos</p>
            </div>
          </div>
        </div>

        {/* Mobile controls for right aligned header items */}
        <div className="flex items-center gap-2 md:hidden">
          <button 
            onClick={onRefresh}
            disabled={loading || isSyncing}
            className={`p-2 rounded-xl transition-all ${isSyncing ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-500'}`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
            className={`p-2 rounded-xl transition-all flex items-center gap-1 border ${isAdminMenuOpen ? 'bg-lime-500 border-lime-500 text-slate-950 shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PERSISTENT HIGH-END SEGMENTED VIEW NAVIGATOR (LIGHT PREMIUM) */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 flex w-full md:w-auto max-w-md shadow-inner gap-1">
        <button
          onClick={() => setView("map")}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all ${view === "map" ? "bg-white text-lime-600 shadow-md border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
        >
          <MapIcon className="w-3.5 h-3.5" /> Mapa
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all ${view === "calendar" ? "bg-white text-lime-600 shadow-md border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
        >
          <CalendarIcon className="w-3.5 h-3.5" /> Agenda
        </button>
        <button
          onClick={() => setView("history")}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all ${view === "history" ? "bg-white text-lime-600 shadow-md border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
        >
          <History className="w-3.5 h-3.5" /> Histórico
        </button>
      </div>

      {/* Desktop items */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex flex-col items-end mr-3">
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
            CRM Sync
          </p>
          <p className={`text-[9px] font-black tracking-wider transition-colors ${isSyncing ? 'text-amber-500 animate-pulse' : 'text-lime-600'}`}>
            {lastSync ? lastSync.toLocaleTimeString('pt-PT') : 'Sincronizando...'}
          </p>
        </div>

        <button 
          onClick={onRefresh}
          disabled={loading || isSyncing}
          className={`p-3 rounded-xl transition-all border border-slate-200 ${isSyncing ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
          title="Sincronizar CRM"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>

        {session && ["admin", "ceo"].includes((session.user as { role?: string })?.role || "") && (
          <button
            onClick={() => router.push("/ceo")}
            className="p-3 bg-white text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-lime-500/50 transition-all shadow-sm flex items-center gap-2 animate-in fade-in"
            title="Painel Executivo do CEO"
          >
            <TrendingUp className="w-4 h-4 text-lime-600" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden lg:inline">Painel CEO</span>
          </button>
        )}

        {session && (session.user as { role?: string })?.role === "admin" && (
          <button
            onClick={() => router.push("/admin/observabilidade")}
            className="p-3 bg-slate-900 text-lime-400 border border-slate-800 rounded-xl hover:bg-slate-800 hover:border-lime-500/50 transition-all shadow-sm flex items-center gap-2"
            title="Consola de Observabilidade & SRE do Criador"
          >
            <Activity className="w-4 h-4 text-lime-400 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden lg:inline">SRE Console</span>
          </button>
        )}

        <button 
          onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
          className={`p-3 rounded-xl transition-all flex items-center gap-2 border ${isAdminMenuOpen ? 'bg-lime-500 border-lime-500 text-slate-950 shadow-md font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'}`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest">
            Filtros & IA Strategy
          </span>
        </button>

        <button 
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            router.push('/');
          }} 
          className="p-3 bg-slate-50 text-slate-400 hover:text-red-600 border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
