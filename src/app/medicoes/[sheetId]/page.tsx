"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Ruler } from "lucide-react";
import MeasurementSheetDetailView from "@/components/features/measurements/MeasurementSheetDetailView";
import {
  getMeasurementSheetByIdAction,
  listMeasurementVersionsAction,
} from "@/actions/measurements-actions";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { isOnboardingDemoId } from "@/lib/demo/demoIds";
import { createOnboardingDemoMeasurementSheet } from "@/lib/demo/demoMeasurementSheet";
import {
  measurementSheetBackHref,
  measurementSheetBackLabel,
  parseMeasurementSheetBackContext,
} from "@/lib/measurements/sheetPageBack";
import { adminFullBleedShell } from "@/lib/admin/fullBleedShell";
import { useSession } from "next-auth/react";
import { canAccessAdminPanel } from "@/lib/auth/rbac";
import type { AppRole } from "@/lib/schemas/auth";

function SheetPageBackControl({
  context,
}: {
  context: ReturnType<typeof parseMeasurementSheetBackContext>;
}) {
  const router = useRouter();
  const label = measurementSheetBackLabel(context);
  const href = measurementSheetBackHref(context);

  if (!href) {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}

export default function MedicoesSheetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sheetId = String(params.sheetId || "");
  const highlightLineId = searchParams.get("linha") || undefined;
  const versionParam = searchParams.get("versao");
  const version = versionParam ? Number.parseInt(versionParam, 10) : undefined;
  const backContext = parseMeasurementSheetBackContext(searchParams.get("de"));

  const [sheet, setSheet] = useState<MeasurementSheet | null>(null);
  const [versions, setVersions] = useState<
    Array<{ sheetId: string; version: number; createdAt: string; technicianName?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const role = session?.user?.role as AppRole | undefined;
  const canEditPrices = Boolean(role && canAccessAdminPanel(role));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (isOnboardingDemoId(sheetId)) {
      setSheet(createOnboardingDemoMeasurementSheet());
      setLoading(false);
      return;
    }
    const result = await getMeasurementSheetByIdAction(
      sheetId,
      Number.isFinite(version) ? version : undefined
    );
    if (!result.success || !result.data) {
      setError(result.error || "Ficha não encontrada.");
      setSheet(null);
      setLoading(false);
      return;
    }
    setSheet(result.data);
    const vers = await listMeasurementVersionsAction(result.data.opportunityId);
    if (vers.success && vers.data) {
      setVersions(vers.data);
    }
    setLoading(false);
  }, [sheetId, version]);

  useEffect(() => {
    void load();
  }, [load]);

  const versionOptions = useMemo(
    () =>
      versions.map((v) => ({
        sheetId: v.sheetId,
        version: v.version,
        label: `v${v.version}`,
      })),
    [versions]
  );

  const handleSelectVersion = (v: number) => {
    const target = versions.find((item) => item.version === v);
    const nextId = target?.sheetId ?? sheetId;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("versao");
    const qs = next.toString();
    router.replace(`/medicoes/${nextId}${qs ? `?${qs}` : ""}`);
  };

  const pageHeader = (
    <header className={adminFullBleedShell.header}>
      <div className={adminFullBleedShell.headerInner}>
        <SheetPageBackControl context={backContext} />
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-muted">
            <Ruler className="h-6 w-6 text-primary-ink" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-foreground">Ficha de medições</h1>
            <p className="text-sm font-medium text-muted-foreground">
              {sheet
                ? sheet.nsi
                  ? `NSI ${sheet.nsi} · ${sheet.clientName}`
                  : sheet.clientName
                : "Detalhe da medição"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className={adminFullBleedShell.page}>
        <header className={adminFullBleedShell.header}>
          <div className={adminFullBleedShell.headerInner}>
            <SheetPageBackControl context={backContext} />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center brutal-grid-bg">
          <Loader2 className="h-8 w-8 animate-spin text-primary-ink" aria-label="A carregar" />
        </main>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className={adminFullBleedShell.page}>
        {pageHeader}
        <main className={adminFullBleedShell.scrollMain}>
          <div className={adminFullBleedShell.content}>
            <p className="text-sm font-bold text-danger-fg">{error || "Ficha indisponível."}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={adminFullBleedShell.page} data-tour="medicoes-sheet-page">
      {pageHeader}
      <main className={adminFullBleedShell.scrollMain}>
        <MeasurementSheetDetailView
          sheet={sheet}
          highlightLineId={highlightLineId}
          exportOpportunityId={sheet.opportunityId}
          versionOptions={versionOptions}
          onSelectVersion={handleSelectVersion}
          canEditPrices={canEditPrices}
          onPricesSaved={() => void load()}
        />
      </main>
    </div>
  );
}
