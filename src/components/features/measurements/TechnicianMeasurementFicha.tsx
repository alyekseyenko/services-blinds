"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getTechnicianMeasurementFichaAction } from "@/actions/measurements-actions";
import MeasurementSheetDetailView from "@/components/features/measurements/MeasurementSheetDetailView";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { measurementVersionButtonLabel } from "@/lib/measurements/versionStamp";

type VersionRow = {
  sheetId: string;
  version: number;
  createdAt: string;
  technicianName?: string;
  editedByName?: string;
};

export function TechnicianMeasurementFicha({
  taskId,
  opportunityId,
}: {
  taskId: string;
  opportunityId: string;
}) {
  const [sheet, setSheet] = useState<MeasurementSheet | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (version?: number) => {
      setLoading(true);
      setError(null);
      const result = await getTechnicianMeasurementFichaAction(opportunityId, taskId, version);
      if (!result.success || !result.data) {
        setSheet(null);
        setVersions([]);
        setError(result.error || "Sem ficha de medições para este serviço.");
        setLoading(false);
        return;
      }
      setSheet(result.data.sheet);
      setVersions(result.data.versions);
      setSelectedVersion(result.data.sheet.version);
      setLoading(false);
    },
    [opportunityId, taskId]
  );

  useEffect(() => {
    setSelectedVersion(undefined);
    void load(undefined);
  }, [load]);

  const versionOptions = useMemo(
    () =>
      versions.map((row) => ({
        sheetId: row.sheetId,
        version: row.version,
        label: measurementVersionButtonLabel(row.version, row.createdAt, row.editedByName),
      })),
    [versions]
  );

  if (loading && !sheet) {
    return (
      <div className="flex min-h-24 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-ink" aria-label="A carregar ficha" />
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <p className="rounded-2xl border-2 border-border bg-card px-4 py-4 text-sm font-semibold text-muted-foreground">
        {error || "Sem ficha de medições para este serviço."}
      </p>
    );
  }

  return (
    <div className={loading ? "opacity-70" : undefined}>
      <MeasurementSheetDetailView
        sheet={sheet}
        exportOpportunityId={opportunityId}
        versionOptions={versionOptions}
        onSelectVersion={(version) => {
          if (version === selectedVersion) return;
          void load(version);
        }}
        canEditPrices={false}
        phoneLayout
        embedded
      />
    </div>
  );
}
