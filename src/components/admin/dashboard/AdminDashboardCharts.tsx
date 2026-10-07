"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminHomeDashboardStats } from "@/lib/admin/homeDashboardStats";
import type { AdminMeasurementsDashboardStats } from "@/lib/schemas/adminDashboard";
import {
  ADMIN_CHART_AXIS,
  ADMIN_CHART_COLORS,
  ADMIN_CHART_GRID,
  ADMIN_CHART_PRIMARY,
  ADMIN_CHART_STROKE,
  ADMIN_CHART_TOOLTIP_BG,
  ADMIN_CHART_TOOLTIP_BORDER,
} from "@/lib/admin/chartTheme";
import { AdminBrutalBarList, AdminChartPanel } from "@/components/admin/dashboard/AdminChartPanel";

type TooltipPayload = { name?: string; value?: number };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      className="rounded-lg border-2 px-3 py-2 text-xs font-bold shadow-none"
      style={{
        background: ADMIN_CHART_TOOLTIP_BG,
        borderColor: ADMIN_CHART_TOOLTIP_BORDER,
        color: "var(--foreground)",
      }}
    >
      {label ? <p className="mb-1 font-semibold text-muted-foreground">{label}</p> : null}
      <p>
        <span>{item.name ?? "Total"}:</span> <span className="ds-num">{item.value}</span>
      </p>
    </div>
  );
}

const chartAxisTick = {
  fill: ADMIN_CHART_AXIS,
  fontSize: 11,
  fontWeight: 800,
};

type Props = {
  pipeline: AdminHomeDashboardStats;
  measurements?: AdminMeasurementsDashboardStats | null;
};

export default function AdminDashboardCharts({ pipeline, measurements }: Props) {
  const serviceBars = pipeline.serviceTypeChart.map((b) => ({
    id: b.id,
    label: b.label,
    value: b.count,
    fill: b.pin,
  }));

  const activityData =
    measurements?.ultimos14Dias.map((d) => ({
      name: d.label,
      fichas: d.count,
    })) ?? [];

  const technicianBars =
    measurements?.porTecnico.map((t, i) => ({
      id: t.name,
      label: t.name,
      value: t.count,
      fill: ADMIN_CHART_COLORS[i % ADMIN_CHART_COLORS.length],
    })) ?? [];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <AdminChartPanel
        title="Tipos de serviço"
        subtitle={`${pipeline.activePipeline} em aberto no mapa`}
        data-tour="admin-home-service-types"
        className="lg:col-span-2"
      >
        <AdminBrutalBarList items={serviceBars} />
      </AdminChartPanel>

      {measurements?.configured ? (
        <AdminChartPanel
          title="Medições no terreno"
          subtitle="Fichas guardadas · últimos 14 dias"
          className="lg:col-span-2"
        >
          <div className="h-52 w-full border-2 border-border-strong bg-muted/30 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid
                  stroke={ADMIN_CHART_GRID}
                  strokeDasharray="0"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={chartAxisTick}
                  axisLine={{ stroke: ADMIN_CHART_STROKE, strokeWidth: 2 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={chartAxisTick}
                  axisLine={{ stroke: ADMIN_CHART_STROKE, strokeWidth: 2 }}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar
                  dataKey="fichas"
                  name="Fichas"
                  fill={ADMIN_CHART_PRIMARY}
                  stroke={ADMIN_CHART_STROKE}
                  strokeWidth={2}
                  radius={0}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminChartPanel>
      ) : null}

      {technicianBars.length > 0 ? (
        <AdminChartPanel
          title="Obras medidas por técnico"
          subtitle="Só visitas de medição"
          className="lg:col-span-2"
        >
          <AdminBrutalBarList items={technicianBars} />
        </AdminChartPanel>
      ) : null}
    </div>
  );
}
