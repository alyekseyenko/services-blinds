import "server-only";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { isMeasurementsDbConfigured, measurementsQuery } from "../db/client";
import { sumMeasurementLinePrices } from "@/lib/measurements/measurementPriceTotal";
import {
  canonicalTechnicianName,
  mergeCountsByCanonicalTechnicianName,
} from "@/lib/technicianIdentity";
import type { MeasurementSheetListEntry } from "../types";
export const MEASUREMENT_TRASH_DAYS = 90;

export async function purgeExpiredMeasurementTrash(): Promise<void> {
  if (!isMeasurementsDbConfigured()) return;
  await measurementsQuery(
    `DELETE FROM measurement_sheet
     WHERE deleted_at IS NOT NULL
       AND deleted_at < NOW() - INTERVAL '90 days'`
  );
}

export async function listLatestMeasurementSheetsForAdmin(options?: {
  search?: string;
  limit?: number;
  deleted?: boolean;
}): Promise<MeasurementSheetListEntry[]> {
  if (!isMeasurementsDbConfigured()) return [];
  await purgeExpiredMeasurementTrash();

  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
  const deleted = options?.deleted === true;
  const search = options?.search?.trim();

  const params: unknown[] = [limit];
  let searchClause = "";
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    searchClause = ` AND (
      l.client_name ILIKE $${idx}
      OR COALESCE(l.nsi, '') ILIKE $${idx}
      OR l.address ILIKE $${idx}
      OR COALESCE(l.technician_name, '') ILIKE $${idx}
    )`;
  }

  const rows = await measurementsQuery<{
    id: string;
    opportunity_id: string;
    version: number;
    client_name: string;
    nsi: string | null;
    address: string;
    technician_name: string | null;
    visit_at: Date | null;
    created_at: Date;
    deleted_at: Date | null;
    deleted_by_name: string | null;
    group_count: string;
    unit_count: string;
    line_prices: (string | null)[] | null;
    printed_at: Date | null;
    printed_by_name: string | null;
  }>(
    `WITH latest AS (
       SELECT DISTINCT ON (opportunity_id) *
       FROM measurement_sheet
       WHERE ${deleted ? "deleted_at IS NOT NULL AND deleted_at >= NOW() - INTERVAL '90 days'" : "deleted_at IS NULL"}
       ORDER BY opportunity_id, ${deleted ? "deleted_at DESC" : "version DESC"}
     )
     SELECT
       l.id,
       l.opportunity_id,
       l.version,
       l.client_name,
       l.nsi,
       l.address,
       l.technician_name,
       l.visit_at,
       l.created_at,
       l.deleted_at,
       l.deleted_by_name,
       l.printed_at,
       l.printed_by_name,
       (SELECT COUNT(*)::text FROM measurement_group g WHERE g.sheet_id = l.id) AS group_count,
       (SELECT COALESCE(SUM(ml.qty), 0)::text
        FROM measurement_line ml
        INNER JOIN measurement_group mg ON mg.id = ml.group_id
        WHERE mg.sheet_id = l.id) AS unit_count,
       (SELECT array_agg(ml.price ORDER BY mg.sort_index, ml.sort_index)
        FROM measurement_line ml
        INNER JOIN measurement_group mg ON mg.id = ml.group_id
        WHERE mg.sheet_id = l.id) AS line_prices
     FROM latest l
     WHERE 1=1${searchClause}
       ${
         deleted
           ? `AND NOT EXISTS (
                SELECT 1 FROM measurement_sheet active
                WHERE active.opportunity_id = l.opportunity_id
                  AND active.deleted_at IS NULL
              )`
           : ""
       }
     ORDER BY ${deleted ? "l.deleted_at DESC" : "l.created_at DESC"}
     LIMIT $1`,
    params
  );

  return rows.map((r) => ({
    sheetId: r.id,
    opportunityId: r.opportunity_id,
    version: r.version,
    clientName: r.client_name,
    nsi: r.nsi,
    address: r.address,
    technicianName: r.technician_name
      ? canonicalTechnicianName(r.technician_name)
      : r.technician_name,
    visitAt: r.visit_at ? new Date(r.visit_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
    groupCount: Number(r.group_count) || 0,
    unitCount: Number(r.unit_count) || 0,
    totalPriceEur: sumMeasurementLinePrices(r.line_prices ?? []),
    deletedAt: r.deleted_at ? new Date(r.deleted_at).toISOString() : null,
    deletedByName: r.deleted_by_name,
    printedAt: r.printed_at ? new Date(r.printed_at).toISOString() : null,
    printedByName: r.printed_by_name,
  }));
}
export type AdminMeasurementsDashboardStats = {
  configured: boolean;
  obrasComMedicoes: number;
  totalUnidades: number;
  fichasRegistadas: number;
  remedicoes: number;
  ultimos14Dias: Array<{ date: string; label: string; count: number }>;
  porTecnico: Array<{ name: string; count: number }>;
};

const EMPTY_MEASUREMENTS_DASHBOARD: AdminMeasurementsDashboardStats = {
  configured: false,
  obrasComMedicoes: 0,
  totalUnidades: 0,
  fichasRegistadas: 0,
  remedicoes: 0,
  ultimos14Dias: [],
  porTecnico: [],
};

export async function fetchAdminMeasurementsDashboardStats(): Promise<AdminMeasurementsDashboardStats> {
  if (!isMeasurementsDbConfigured()) {
    return { ...EMPTY_MEASUREMENTS_DASHBOARD, configured: false };
  }

  const summaryRows = await measurementsQuery<{
    obras: string;
    fichas: string;
    remedicoes: string;
    unidades: string;
  }>(
    `WITH latest AS (
       SELECT DISTINCT ON (opportunity_id) id, opportunity_id, version
       FROM measurement_sheet
       WHERE deleted_at IS NULL
       ORDER BY opportunity_id, version DESC
     )
     SELECT
       (SELECT COUNT(*)::text FROM latest) AS obras,
       (SELECT COUNT(*)::text FROM measurement_sheet WHERE deleted_at IS NULL) AS fichas,
       (SELECT COUNT(*)::text FROM latest WHERE version > 1) AS remedicoes,
       (SELECT COALESCE(SUM(ml.qty), 0)::text
        FROM measurement_line ml
        INNER JOIN measurement_group mg ON mg.id = ml.group_id
        INNER JOIN latest l ON l.id = mg.sheet_id) AS unidades`
  );

  const summary = summaryRows[0];

  const dailyRows = await measurementsQuery<{ day: Date; count: string }>(
    `SELECT d.day::date AS day, COUNT(ms.id)::text AS count
     FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, INTERVAL '1 day') AS d(day)
     LEFT JOIN measurement_sheet ms
       ON (ms.created_at AT TIME ZONE 'UTC')::date = d.day::date
      AND ms.deleted_at IS NULL
     GROUP BY d.day
     ORDER BY d.day ASC`
  );

  const techRows = await measurementsQuery<{ name: string; count: string }>(
    `WITH latest AS (
       SELECT DISTINCT ON (opportunity_id) technician_name
       FROM measurement_sheet
       WHERE deleted_at IS NULL
       ORDER BY opportunity_id, version DESC
     )
     SELECT
       COALESCE(NULLIF(TRIM(technician_name), ''), 'Sem técnico') AS name,
       COUNT(*)::text AS count
     FROM latest
     GROUP BY 1
     ORDER BY COUNT(*) DESC
     LIMIT 6`
  );

  return {
    configured: true,
    obrasComMedicoes: Number(summary?.obras) || 0,
    fichasRegistadas: Number(summary?.fichas) || 0,
    remedicoes: Number(summary?.remedicoes) || 0,
    totalUnidades: Number(summary?.unidades) || 0,
    ultimos14Dias: dailyRows.map((r) => {
      const day = new Date(r.day);
      return {
        date: format(day, "yyyy-MM-dd"),
        label: format(day, "d MMM", { locale: pt }),
        count: Number(r.count) || 0,
      };
    }),
    porTecnico: mergeCountsByCanonicalTechnicianName(
      techRows.map((r) => ({
        name: r.name,
        count: Number(r.count) || 0,
      }))
    ),
  };
}
