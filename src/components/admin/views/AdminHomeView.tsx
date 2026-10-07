"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Calendar,
  History,
  Map as MapIcon,
  Ruler,
  Search,
  MapPin,
  ChevronRight,
  Loader2,
  ClipboardPlus,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import type { AdminHomeDashboardStats } from "@/lib/admin/homeDashboardStats";
import type { AdminViewId } from "@/components/admin/AdminPrimaryNav";
import type { ZoneInsight } from "@/types/admin";
import type { AdminMeasurementsDashboardStats } from "@/lib/schemas/adminDashboard";
import type { MeasurementSheetListEntry } from "@/lib/measurements/types";
import {
  getAdminMeasurementsDashboardAction,
  listMeasurementSheetsAction,
} from "@/actions/measurements-actions";
import { appendMeasurementSheetDeParam } from "@/lib/measurements/sheetPageBack";
import { adminFullBleedShell } from "@/lib/admin/fullBleedShell";

const AdminDashboardCharts = dynamic(
  () => import("@/components/admin/dashboard/AdminDashboardCharts"),
  {
    ssr: false,
    loading: () => (
      <Panel variant="outline" className="flex min-h-48 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-ink" aria-hidden />
      </Panel>
    ),
  }
);

type Props = {
  stats: AdminHomeDashboardStats;
  zoneInsights: ZoneInsight[];
  onNavigate: (view: AdminViewId) => void;
  onOpenSearch: () => void;
  onOpenMedicoes: () => void;
  onOpenCreateService?: () => void;
};

export default function AdminHomeView({
  stats,
  zoneInsights,
  onNavigate,
  onOpenSearch,
  onOpenMedicoes,
  onOpenCreateService,
}: Props) {
  const topZones = zoneInsights.slice(0, 4);
  const [measStats, setMeasStats] = useState<AdminMeasurementsDashboardStats | null>(null);
  const [recentSheets, setRecentSheets] = useState<MeasurementSheetListEntry[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setInsightsLoading(true);
      const [dash, list] = await Promise.all([
        getAdminMeasurementsDashboardAction(),
        listMeasurementSheetsAction(),
      ]);
      if (cancelled) return;
      if (dash.success && dash.data) setMeasStats(dash.data);
      if (list.success && list.data) setRecentSheets(list.data.slice(0, 4));
      setInsightsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const m = measStats;

  const secondaryKpis = [
    { label: "Agendados", value: stats.scheduledActive, onClick: () => onNavigate("map") },
    { label: "Por confirmar", value: stats.pendingConfirmation, onClick: () => onNavigate("calendar") },
    { label: "Sem GPS", value: stats.withoutGps, tone: "danger" as const, onClick: () => onNavigate("map") },
    { label: "Concluídos", value: stats.completed, onClick: () => onNavigate("history") },
  ];

  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-hidden brutal-grid-bg bg-background"
      data-tour="admin-home-dashboard"
    >
      <div className={cn(adminFullBleedShell.content, "min-h-0 flex-1 overflow-y-auto space-y-8")}>
        <section aria-label="Resumo do pipeline">
          <Panel variant="ink" className="overflow-hidden rounded-2xl border-2 border-border-strong p-0 shadow-none">
            <div className="grid grid-cols-2 divide-x-2 divide-y-2 divide-border-strong sm:grid-cols-4 sm:divide-y-0">
              <HeroMetric
                label="Em aberto"
                value={stats.activePipeline}
                onClick={() => onNavigate("map")}
              />
              <HeroMetric
                label="Por agendar"
                value={stats.toSchedule}
                accent="warning"
                onClick={() => onNavigate("map")}
              />
              <HeroMetric
                label="Em curso"
                value={stats.inProgress}
                accent="info"
                onClick={() => onNavigate("map")}
              />
              <HeroMetric
                label="Incompletos"
                value={stats.incomplete}
                accent="danger"
                onClick={() => onNavigate("history")}
              />
            </div>
          </Panel>
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:gap-6">
          <div className="space-y-6 xl:col-span-8">
            <section aria-label="Análise visual">
              <SectionHeading
                title="Pipeline"
                detail="Estado e tipos de serviço no CRM"
              />
              <AdminDashboardCharts pipeline={stats} measurements={insightsLoading ? null : m} />
            </section>
          </div>

          <aside className="space-y-6 xl:col-span-4">
            <Panel variant="outline" className="space-y-3 p-4 shadow-none">
              <h3 className="ds-kicker">Mais indicadores</h3>
              <ul className="divide-y-2 divide-border">
                {secondaryKpis.map((kpi) => (
                  <li key={kpi.label}>
                    <button
                      type="button"
                      onClick={kpi.onClick}
                      className="flex w-full min-h-12 items-center justify-between gap-2 py-3 text-left"
                    >
                      <span className="text-xs font-bold text-muted-foreground">{kpi.label}</span>
                      <span
                        className={cn(
                          "ds-num text-xl font-black",
                          kpi.tone === "danger" ? "text-danger-fg" : "text-foreground"
                        )}
                      >
                        {kpi.value}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>

            {topZones.length > 0 ? (
              <Panel variant="outline" className="space-y-3 p-4 shadow-none">
                <h3 className="ds-kicker">Zonas — por agendar</h3>
                <ul className="space-y-2">
                  {topZones.map((zone) => (
                    <li key={zone.key}>
                      <button
                        type="button"
                        onClick={() => onNavigate("map")}
                        className="flex w-full min-h-11 items-center justify-between gap-2 rounded-xl border-2 border-border bg-card px-3 py-2 text-left transition-colors hover:border-border-strong active:scale-[0.99]"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-foreground">
                          <MapPin className="h-4 w-4 shrink-0 text-primary-ink" aria-hidden />
                          <span className="truncate">{zone.name}</span>
                        </span>
                        <span className="ds-num shrink-0 text-sm font-black text-foreground">
                          {zone.count}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            <section aria-label="Medições no terreno">
              <div className="mb-3 flex items-center justify-between gap-2">
                <SectionHeading title="Medições" detail="Fichas dos técnicos" compact />
                <button
                  type="button"
                  onClick={onOpenMedicoes}
                  className="text-xs font-black uppercase tracking-wider text-primary-ink"
                >
                  Lista
                </button>
              </div>
              {insightsLoading ? (
                <Panel variant="outline" className="flex min-h-20 items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-ink" aria-hidden />
                </Panel>
              ) : m?.configured ? (
                <div className="grid grid-cols-2 gap-2">
                  <MiniMetric label="Obras" value={m.obrasComMedicoes} onClick={onOpenMedicoes} />
                  <MiniMetric label="Unidades" value={m.totalUnidades} onClick={onOpenMedicoes} />
                  <MiniMetric label="Fichas" value={m.fichasRegistadas} onClick={onOpenMedicoes} />
                  <MiniMetric label="Remedições" value={m.remedicoes} onClick={onOpenMedicoes} />
                </div>
              ) : (
                <Panel variant="outline" className="p-3 text-xs font-semibold text-muted-foreground">
                  Base de medições indisponível.
                </Panel>
              )}
            </section>
          </aside>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {!insightsLoading && recentSheets.length > 0 ? (
            <Panel variant="outline" className="space-y-3 p-4 shadow-none">
              <div className="flex items-center justify-between gap-2">
                <h3 className="ds-kicker">Medições recentes</h3>
                <button
                  type="button"
                  onClick={onOpenMedicoes}
                  className="text-xs font-bold text-primary-ink"
                >
                  Ver todas
                </button>
              </div>
              <ul className="space-y-2">
                {recentSheets.map((item) => (
                  <li key={item.sheetId}>
                    <Link
                      href={appendMeasurementSheetDeParam(`/medicoes/${item.sheetId}`, "painel")}
                      className="flex min-h-12 items-center justify-between gap-2 border-2 border-border bg-card px-3 py-2 transition-colors hover:border-border-strong"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-foreground">
                          {item.clientName}
                        </span>
                        <span className="block text-xs font-medium text-muted-foreground">
                          {item.nsi ? `NSI ${item.nsi}` : "Sem NSI"} · v{item.version}
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <section aria-label="Explorar">
            <h3 className="ds-kicker mb-3">Explorar</h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <NavRow icon={MapIcon} label="Mapa" detail="Agendar e rotas" onClick={() => onNavigate("map")} />
              <NavRow
                icon={Calendar}
                label="Agenda"
                detail="Por técnico"
                onClick={() => onNavigate("calendar")}
              />
              <NavRow
                icon={History}
                label="Histórico"
                detail="Concluídos"
                onClick={() => onNavigate("history")}
              />
              <NavRow icon={Ruler} label="Medições" detail="Fichas" onClick={onOpenMedicoes} />
              {onOpenCreateService ? (
                <NavRow
                  icon={ClipboardPlus}
                  label="Novo serviço"
                  detail="Cliente no Twenty"
                  onClick={onOpenCreateService}
                  dataTour="admin-home-novo-servico"
                />
              ) : null}
              <NavRow
                icon={Search}
                label="Pesquisar"
                detail="Cliente e morada"
                onClick={onOpenSearch}
                className={onOpenCreateService ? undefined : "sm:col-span-2"}
              />
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  title,
  detail,
  compact,
}: {
  title: string;
  detail: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div>
        <h3 className="ds-kicker">{title}</h3>
        <p className="text-xs font-medium text-muted-foreground">{detail}</p>
      </div>
    );
  }
  return (
    <div className="mb-4">
      <h2 className="ds-kicker">{title}</h2>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{detail}</p>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  accent?: "warning" | "info" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[5.5rem] flex-col justify-center px-4 py-4 text-left transition-opacity hover:opacity-90 active:scale-[0.99]"
    >
      <span className="text-xs font-bold uppercase tracking-wider text-ink-foreground/70">
        {label}
      </span>
      <span
        className={cn(
          "ds-num mt-2 text-3xl font-black leading-none sm:text-4xl",
          accent === "danger" && "text-danger-solid",
          accent === "warning" && "text-warning-solid",
          accent === "info" && "text-info-solid",
          !accent && "text-neon"
        )}
      >
        {value}
      </span>
    </button>
  );
}

function MiniMetric({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border-2 border-border bg-card p-3 text-left shadow-none hover:border-border-strong"
    >
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="ds-num mt-1 text-xl font-black text-foreground">{value}</p>
    </button>
  );
}

function NavRow({
  icon: Icon,
  label,
  detail,
  onClick,
  className,
  dataTour,
}: {
  icon: typeof MapIcon;
  label: string;
  detail: string;
  onClick: () => void;
  className?: string;
  dataTour?: string;
}) {
  return (
    <li className={className}>
      <button
        type="button"
        onClick={onClick}
        data-tour={dataTour}
        className="flex w-full min-h-14 items-center gap-3 border-2 border-border bg-card px-3 py-3 text-left shadow-none transition-colors hover:border-border-strong active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border-strong bg-muted">
          <Icon className="h-5 w-5 text-primary-ink" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">{label}</span>
          <span className="block text-xs font-medium text-muted-foreground">{detail}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  );
}
