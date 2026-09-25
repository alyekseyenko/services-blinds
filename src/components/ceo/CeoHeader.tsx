"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { clearSessionStoragePreservingPreferences } from "@/lib/clientPreferences";
import { Calendar, RefreshCw, ShieldCheck, LogOut } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { APP_LOGO_PATH } from "@/lib/branding";

export interface CeoHeaderProps {
  lastUpdated: string;
  selectedYear: number | null;
  yearOptions: { value: number | null; label: string }[];
  onYearChange: (year: number | null) => void;
  onRefresh: () => void;
  refreshing: boolean;
  metricsLoaded: boolean;
}

export default function CeoHeader({
  lastUpdated,
  selectedYear,
  yearOptions,
  onYearChange,
  onRefresh,
  refreshing,
  metricsLoaded,
}: CeoHeaderProps) {
  return (
    <header className="safe-top glass-panel-light mb-6 flex flex-col gap-4 rounded-[2rem] border border-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.05)] sm:mb-8 sm:gap-6 sm:rounded-[2.5rem] sm:p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center sm:h-16 sm:w-16">
          <Image
            src={APP_LOGO_PATH}
            alt="Company logo"
            width={64}
            height={64}
            className="w-14 h-14 object-contain drop-shadow-sm"
            priority
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#84cc16] text-[#090d16] text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
              Visão Executiva Full Screen
            </span>
            <span className="text-slate-400 text-xs font-semibold">
              • Atualizado às {lastUpdated || "--:--"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#090d16] tracking-tight uppercase italic mt-1">
            Painel do CEO
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Inteligência Comercial & Gestão Anual de Serviços
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-inner">
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-slate-500 text-xs font-black uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-[#84cc16]" />
            <span className="hidden sm:inline">Ano</span>
          </div>
          <SearchableSelect<number | null>
            value={selectedYear}
            onChange={onYearChange}
            options={yearOptions}
            placeholder="Selecionar ano"
            searchPlaceholder="Pesquisar ano..."
            disabled={!metricsLoaded}
            data-testid="ceo-year-select"
          />
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? "animate-spin text-[#84cc16]" : ""}`} />
          {refreshing ? "Sincronizando..." : "Atualizar"}
        </button>

        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#121622] text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#84cc16]" />
          Painel Admin
        </Link>

        <button
          type="button"
          onClick={() => {
            clearSessionStoragePreservingPreferences();
            signOut({ callbackUrl: "/" });
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 text-red-600 border border-red-100 text-xs font-black uppercase tracking-wider hover:bg-red-100 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </header>
  );
}
