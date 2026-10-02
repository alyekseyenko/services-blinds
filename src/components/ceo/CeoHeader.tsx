"use client";

import Image from "next/image";
import Link from "next/link";
import { signOutToAppLogin } from "@/lib/clientSignOut";
import { clearSessionStoragePreservingPreferences } from "@/lib/clientPreferences";
import { Calendar, RefreshCw, ShieldCheck, LogOut } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { APP_LOGO_PATH } from "@/lib/branding";
import TourHelpButton from "@/components/onboarding/TourHelpButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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
    <header className="safe-top brutal-panel mb-6 flex flex-col gap-4 p-4 sm:mb-8 sm:gap-6 sm:p-6 md:p-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center sm:h-16 sm:w-16">
          <Image
            src={APP_LOGO_PATH}
            alt="Logótipo da empresa"
            width={64}
            height={64}
            className="w-14 h-14 object-contain drop-shadow-sm"
            priority
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border-2 border-border-strong bg-primary px-2.5 py-0.5 text-xs font-black uppercase tracking-widest text-primary-foreground">
              Visão Executiva Full Screen
            </span>
            <span className="text-muted-foreground text-xs font-semibold">
              • Atualizado às {lastUpdated || "--:--"}
            </span>
          </div>
          <h1 className="ds-title mt-1 text-2xl tracking-tight text-foreground sm:text-3xl">
            Painel do CEO
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Inteligência Comercial & Gestão Anual de Serviços
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-xl border-2 border-border-strong bg-muted p-1.5" data-tour="ceo-year">
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary-ink" />
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

        <TourHelpButton className="border-border bg-card" />
        <ThemeToggle />

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          data-tour="ceo-refresh"
          className="flex items-center gap-2 rounded-xl border-2 border-border-strong bg-card px-4 py-2.5 text-xs font-black uppercase tracking-wider text-foreground transition-all hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          {refreshing ? "Sincronizando..." : "Atualizar"}
        </button>

        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-xl border-2 border-border-strong bg-ink px-4 py-2.5 text-xs font-black uppercase tracking-wider text-ink-foreground transition-all hover:bg-ink/90"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-neon" />
          Painel Admin
        </Link>

        <button
          type="button"
          onClick={() => {
            clearSessionStoragePreservingPreferences();
            signOutToAppLogin();
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-danger-surface text-danger-solid border border-danger-border text-xs font-black uppercase tracking-wider hover:bg-danger-surface transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>
    </header>
  );
}
