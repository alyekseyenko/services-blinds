"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { AdminManualMeasurementsTrigger } from "@/components/admin/AdminManualMeasurementsDialog";
import { cn } from "@/lib/cn";
import type { MeasurementPrintFilter } from "@/lib/measurements/printStatus";

export type MeasurementListMode = "ativas" | "apagadas";
export type MeasurementPriceFilter = "todas" | "sem-preco" | "com-preco";

function SegmentButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 flex-1 rounded-lg px-3 text-xs font-black uppercase tracking-wide",
        selected ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1 rounded-xl border-2 border-border bg-muted/60 p-1">{children}</div>
    </div>
  );
}

export function AdminMeasurementsListFilters(props: {
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  mode: MeasurementListMode;
  onModeChange: (mode: MeasurementListMode) => void;
  priceFilter: MeasurementPriceFilter;
  onPriceFilterChange: (value: MeasurementPriceFilter) => void;
  printFilter: MeasurementPrintFilter;
  onPrintFilterChange: (value: MeasurementPrintFilter) => void;
  onInsertClick: () => void;
}) {
  const filtersDirty = props.priceFilter !== "todas" || props.printFilter !== "todas";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Pesquisar medições</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="Pesquisar por cliente, NSI, morada ou técnico…"
            className="min-h-12 w-full rounded-xl border-2 border-border bg-card pl-10 pr-3 text-sm font-medium"
            data-tour="admin-medicoes-search"
          />
        </label>
        {props.mode === "ativas" ? (
          <AdminManualMeasurementsTrigger onClick={props.onInsertClick} disabled={props.loading} />
        ) : null}
      </div>

      <div
        className={
          props.mode === "ativas"
            ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            : "grid gap-3 sm:grid-cols-2"
        }
      >
        <FilterGroup label="Lista">
          <SegmentButton selected={props.mode === "ativas"} onClick={() => props.onModeChange("ativas")}>
            Ativas
          </SegmentButton>
          <SegmentButton selected={props.mode === "apagadas"} onClick={() => props.onModeChange("apagadas")}>
            Apagadas
          </SegmentButton>
        </FilterGroup>

        {props.mode === "ativas" ? (
          <>
            <FilterGroup label="Preço">
              <SegmentButton
                selected={props.priceFilter === "todas"}
                onClick={() => props.onPriceFilterChange("todas")}
              >
                Todas
              </SegmentButton>
              <SegmentButton
                selected={props.priceFilter === "sem-preco"}
                onClick={() => props.onPriceFilterChange("sem-preco")}
              >
                Sem preço
              </SegmentButton>
              <SegmentButton
                selected={props.priceFilter === "com-preco"}
                onClick={() => props.onPriceFilterChange("com-preco")}
              >
                Com preço
              </SegmentButton>
            </FilterGroup>
            <FilterGroup label="Impressão">
              <SegmentButton
                selected={props.printFilter === "todas"}
                onClick={() => props.onPrintFilterChange("todas")}
              >
                Todas
              </SegmentButton>
              <SegmentButton
                selected={props.printFilter === "por-imprimir"}
                onClick={() => props.onPrintFilterChange("por-imprimir")}
              >
                Por imprimir
              </SegmentButton>
              <SegmentButton
                selected={props.printFilter === "impressas"}
                onClick={() => props.onPrintFilterChange("impressas")}
              >
                Impressas
              </SegmentButton>
            </FilterGroup>
          </>
        ) : null}
      </div>

      {props.mode === "ativas" && filtersDirty ? (
        <button
          type="button"
          onClick={() => {
            props.onPriceFilterChange("todas");
            props.onPrintFilterChange("todas");
          }}
          className="min-h-11 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Limpar filtros de preço e impressão
        </button>
      ) : null}
    </div>
  );
}
