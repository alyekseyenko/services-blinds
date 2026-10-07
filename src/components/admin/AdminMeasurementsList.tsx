"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, Ruler, Search } from "lucide-react";
import { listMeasurementSheetsAction } from "@/actions/measurements-actions";
import type { MeasurementSheetListEntry } from "@/lib/measurements/types";
import { Panel } from "@/components/ui/Panel";
import { formatMeasurementTotalPriceEur } from "@/lib/measurements/measurementPriceTotal";
import { appendMeasurementSheetDeParam } from "@/lib/measurements/sheetPageBack";
import { adminFullBleedShell } from "@/lib/admin/fullBleedShell";

export default function AdminMeasurementsList() {
  const [items, setItems] = useState<MeasurementSheetListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError(null);
    const res = await listMeasurementSheetsAction(term.trim() || undefined);
    if (!res.success) {
      setError(res.error || "Não foi possível carregar.");
      setItems([]);
    } else {
      setItems(res.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    void load(query);
  }, [load, query]);

  return (
    <div className={adminFullBleedShell.page}>
      <header className={adminFullBleedShell.header}>
        <div className={adminFullBleedShell.headerInner}>
          <Link
            href="/admin"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar ao painel
          </Link>
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-muted">
              <Ruler className="h-6 w-6 text-primary-ink" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-black text-foreground">Medições</h1>
              <p className="text-sm font-medium text-muted-foreground">
                Última versão por obra — para orçamentação e consulta. Os técnicos registem no terreno;
                aqui vê e abre a ficha completa.
              </p>
            </div>
          </div>
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por cliente, NSI, morada ou técnico…"
              className="min-h-12 w-full rounded-xl border-2 border-border bg-card pl-10 pr-3 text-sm font-medium"
              data-tour="admin-medicoes-search"
            />
          </label>
        </div>
      </header>

      <main className={adminFullBleedShell.scrollMain} data-tour="admin-medicoes-list">
        <div className={adminFullBleedShell.content}>
        {loading ? (
          <div className="flex min-h-32 items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            A carregar medições…
          </div>
        ) : null}

        {!loading && error ? (
          <Panel className="p-4">
            <p className="text-sm font-bold text-danger-fg">{error}</p>
          </Panel>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <Panel className="p-6 text-center">
            <p className="text-sm font-bold text-foreground">Sem medições na base de dados.</p>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              Quando um técnico guardar medições (online ou após sincronizar), aparecem aqui.
            </p>
          </Panel>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.sheetId}>
                <Link
                  href={appendMeasurementSheetDeParam(`/medicoes/${item.sheetId}`, "lista")}
                  className="block rounded-2xl border-2 border-border bg-card p-4 transition-colors hover:border-primary-ink active:scale-[0.99]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-foreground truncate">
                        {item.clientName}
                      </p>
                      <p className="text-xs font-bold text-muted-foreground">
                        {item.nsi ? `NSI ${item.nsi}` : "Sem NSI"} · v{item.version}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground line-clamp-2">
                        {item.address}
                      </p>
                    </div>
                    <ExternalLink className="h-5 w-5 shrink-0 text-primary-ink" aria-hidden />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Técnico
                      </dt>
                      <dd className="font-bold">{item.technicianName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Registo
                      </dt>
                      <dd className="font-bold">
                        {new Date(item.createdAt).toLocaleString("pt-PT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Produtos
                      </dt>
                      <dd className="font-bold">{item.groupCount}</dd>
                    </div>
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Unidades
                      </dt>
                      <dd className="font-bold">{item.unitCount}</dd>
                    </div>
                    <div>
                      <dt className="font-black uppercase tracking-wider text-muted-foreground">
                        Preço total
                      </dt>
                      <dd className="font-bold text-primary-ink">
                        {item.totalPriceEur != null
                          ? formatMeasurementTotalPriceEur(item.totalPriceEur)
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        </div>
      </main>
    </div>
  );
}
