import "server-only";
import { WAREHOUSE_STATUS } from "@/lib/crm/contract";
import type { WarehouseGroup, WarehouseService } from "@/lib/warehouse/types";
import { getProductTypeLabel } from "@/lib/measurementLabels";
import { isMeasurementsDbConfigured, measurementsQuery } from "./db/client";

type CrmPrepOpportunity = {
  id: string;
  name: string;
  nsi: string;
  createdAt: string;
  client: string;
  taskId?: string;
};

type DbLineRow = {
  opportunity_id: string;
  line_id: string;
  product_type: string;
  material: string | null;
  other_material: string | null;
  model: string | null;
  ral: string | null;
  fabric: string | null;
  reference: string | null;
  activation: string | null;
  observations: string | null;
  qty: string;
  width_mm: string;
  height_mm: string;
  division: string | null;
  fixation: string | null;
  controls: string | null;
  is_prepared: boolean;
  warehouse_state: string;
  group_sort: number;
};

export async function fetchLatestMeasurementLinesForOpportunities(
  opportunityIds: string[]
): Promise<Map<string, WarehouseGroup[]>> {
  const result = new Map<string, WarehouseGroup[]>();
  if (!isMeasurementsDbConfigured() || opportunityIds.length === 0) {
    return result;
  }

  const rows = await measurementsQuery<DbLineRow>(
    `WITH latest AS (
       SELECT opportunity_id, MAX(version) AS version
       FROM measurement_sheet
       WHERE opportunity_id = ANY($1::uuid[])
       GROUP BY opportunity_id
     )
     SELECT
       ms.opportunity_id,
       ml.id AS line_id,
       mg.product_type,
       mg.material,
       mg.other_material,
       mg.model,
       mg.ral,
       mg.fabric,
       mg.reference,
       mg.activation,
       mg.observations,
       ml.qty,
       ml.width_mm,
       ml.height_mm,
       ml.division,
       ml.fixation,
       ml.controls,
       ml.is_prepared,
       ml.warehouse_state,
       mg.sort_index AS group_sort
     FROM latest l
     INNER JOIN measurement_sheet ms
       ON ms.opportunity_id = l.opportunity_id AND ms.version = l.version
     INNER JOIN measurement_group mg ON mg.sheet_id = ms.id
     INNER JOIN measurement_line ml ON ml.group_id = mg.id
     ORDER BY ms.opportunity_id, mg.sort_index, ml.sort_index`,
    [opportunityIds]
  );

  for (const row of rows) {
    const type = row.product_type;
    const material =
      row.material === "OUTRO"
        ? row.other_material || "Outro"
        : row.material || row.model || undefined;

    const groups = result.get(row.opportunity_id) ?? [];
    let group = groups.find((g) => g.type === type && g.id === `db-${type}-${row.group_sort}`);
    if (!group) {
      group = {
        id: `db-${type}-${row.group_sort}`,
        type,
        details: {
          material: material || undefined,
          model: row.model || undefined,
          ral: row.ral || undefined,
          activation: row.activation || undefined,
        },
        measurements: [],
      };
      groups.push(group);
    }

    group.measurements.push({
      id: row.line_id,
      qty: Number(row.qty) || 0,
      width: Number(row.width_mm) || 0,
      height: Number(row.height_mm) || 0,
      notes: row.division || undefined,
      fixation: row.fixation || undefined,
      controls: row.controls || undefined,
      isPrepared: row.is_prepared,
      estadoDoArmazem: row.warehouse_state || WAREHOUSE_STATUS.EM_PREPARACAO,
    });

    result.set(row.opportunity_id, groups);
  }

  return result;
}

export function mergeCrmPrepWithMeasurementLines(
  opportunities: CrmPrepOpportunity[],
  linesByOpp: Map<string, WarehouseGroup[]>
): WarehouseService[] {
  return opportunities.map((opp) => {
    const groups = linesByOpp.get(opp.id) ?? [];
    return {
      id: opp.id,
      title: opp.name,
      nsi: opp.nsi,
      client: opp.client,
      createdAt: opp.createdAt,
      measurements: groups.length > 0 ? { groups } : undefined,
      taskId: opp.taskId,
    };
  });
}

export type CeoWarehouseItemStats = {
  totalItems: number;
  preparedItems: number;
  pendingItems: number;
  preparationRate: number;
};

export async function fetchCeoWarehouseItemStatsFromDb(): Promise<CeoWarehouseItemStats | null> {
  if (!isMeasurementsDbConfigured()) return null;

  const rows = await measurementsQuery<{ is_prepared: boolean; warehouse_state: string }>(
    `WITH latest AS (
       SELECT opportunity_id, MAX(version) AS version
       FROM measurement_sheet
       GROUP BY opportunity_id
     )
     SELECT ml.is_prepared, ml.warehouse_state
     FROM latest l
     INNER JOIN measurement_sheet ms
       ON ms.opportunity_id = l.opportunity_id AND ms.version = l.version
     INNER JOIN measurement_group mg ON mg.sheet_id = ms.id
     INNER JOIN measurement_line ml ON ml.group_id = mg.id`
  );

  let preparedItems = 0;
  for (const row of rows) {
    if (row.is_prepared || row.warehouse_state === WAREHOUSE_STATUS.PREPARADO) {
      preparedItems += 1;
    }
  }
  const totalItems = rows.length;
  const pendingItems = totalItems - preparedItems;
  const preparationRate =
    totalItems > 0 ? Number(((preparedItems / totalItems) * 100).toFixed(1)) : 0;

  return { totalItems, preparedItems, pendingItems, preparationRate };
}

export function formatWarehouseProductLabel(productType: string): string {
  return getProductTypeLabel(productType);
}
