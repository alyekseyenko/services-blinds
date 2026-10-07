import "server-only";
import { randomUUID } from "crypto";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { PoolClient } from "pg";
import type { MeasurementsPayload } from "@/lib/schemas";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { sanitizeGroupDetailsForType } from "@/lib/measurementProductDetails";
import { pickGroupExtras, pickLineExtras } from "@/lib/measurements/extendedFields";
import { syncMeasurementRowLegacyFields } from "@/lib/measurements/rowPayload";
import type { MeasurementRow } from "@/types";
import {
  isMeasurementsDbConfigured,
  measurementsQuery,
  withMeasurementsTransaction,
} from "./db/client";
import { sumMeasurementLinePrices } from "@/lib/measurements/measurementPriceTotal";
import { buildMeasurementSheetFromDb } from "./toSheet";
import type {
  MeasurementGroupRow,
  MeasurementLineRow,
  MeasurementSheetListEntry,
  MeasurementSheetRow,
} from "./types";
import {
  opportunityHasWarehouseLock,
  WAREHOUSE_LOCK_ERROR_MESSAGE,
} from "./warehouseLock";
import { WAREHOUSE_STATUS } from "@/lib/crm/contract";

export type SaveSubmittedSheetInput = {
  opportunityId: string;
  taskId: string;
  clientRequestId?: string;
  technicianName?: string;
  technicianUserId?: string;
  clientName: string;
  nsi?: string;
  address: string;
  serviceLabel?: string;
  visitAt?: Date;
  payload: MeasurementsPayload;
};

export type SaveSubmittedSheetResult =
  | { success: true; sheetId: string; version: number; idempotent?: boolean }
  | { success: false; error: string };

async function loadGroupsAndLines(
  sheetId: string
): Promise<{ groups: MeasurementGroupRow[]; linesByGroup: Map<string, MeasurementLineRow[]> }> {
  const groups = await measurementsQuery<MeasurementGroupRow>(
    `SELECT * FROM measurement_group WHERE sheet_id = $1 ORDER BY sort_index ASC`,
    [sheetId]
  );
  const lines = await measurementsQuery<MeasurementLineRow>(
    `SELECT ml.* FROM measurement_line ml
     INNER JOIN measurement_group mg ON mg.id = ml.group_id
     WHERE mg.sheet_id = $1
     ORDER BY mg.sort_index ASC, ml.sort_index ASC`,
    [sheetId]
  );
  const linesByGroup = new Map<string, MeasurementLineRow[]>();
  for (const line of lines) {
    const bucket = linesByGroup.get(line.group_id) ?? [];
    bucket.push(line);
    linesByGroup.set(line.group_id, bucket);
  }
  return { groups, linesByGroup };
}

export async function getSheetById(sheetId: string): Promise<(MeasurementSheet & {
  sheetId: string;
  version: number;
}) | null> {
  if (!isMeasurementsDbConfigured()) return null;
  const sheets = await measurementsQuery<MeasurementSheetRow>(
    `SELECT * FROM measurement_sheet WHERE id = $1`,
    [sheetId]
  );
  const sheet = sheets[0];
  if (!sheet) return null;
  const { groups, linesByGroup } = await loadGroupsAndLines(sheetId);
  return buildMeasurementSheetFromDb(sheet, groups, linesByGroup);
}

export async function getLatestMeasurementsPayload(
  opportunityId: string
): Promise<MeasurementsPayload | null> {
  if (!isMeasurementsDbConfigured()) return null;
  const sheets = await measurementsQuery<MeasurementSheetRow>(
    `SELECT * FROM measurement_sheet
     WHERE opportunity_id = $1
     ORDER BY version DESC
     LIMIT 1`,
    [opportunityId]
  );
  const sheet = sheets[0];
  if (!sheet) return null;
  const { groups, linesByGroup } = await loadGroupsAndLines(sheet.id);
  const { sheetRowsToMeasurementsPayload } = await import("./toPayload");
  return sheetRowsToMeasurementsPayload(groups, linesByGroup);
}

export async function getLatestSheetByOpportunity(
  opportunityId: string
): Promise<(MeasurementSheet & { sheetId: string; version: number }) | null> {
  if (!isMeasurementsDbConfigured()) return null;
  const sheets = await measurementsQuery<MeasurementSheetRow>(
    `SELECT * FROM measurement_sheet
     WHERE opportunity_id = $1
     ORDER BY version DESC
     LIMIT 1`,
    [opportunityId]
  );
  const sheet = sheets[0];
  if (!sheet) return null;
  const { groups, linesByGroup } = await loadGroupsAndLines(sheet.id);
  return buildMeasurementSheetFromDb(sheet, groups, linesByGroup);
}

export async function getSheetByOpportunityVersion(
  opportunityId: string,
  version: number
): Promise<(MeasurementSheet & { sheetId: string; version: number }) | null> {
  if (!isMeasurementsDbConfigured()) return null;
  const sheets = await measurementsQuery<MeasurementSheetRow>(
    `SELECT * FROM measurement_sheet
     WHERE opportunity_id = $1 AND version = $2`,
    [opportunityId, version]
  );
  const sheet = sheets[0];
  if (!sheet) return null;
  const { groups, linesByGroup } = await loadGroupsAndLines(sheet.id);
  return buildMeasurementSheetFromDb(sheet, groups, linesByGroup);
}

export async function listLatestMeasurementSheetsForAdmin(options?: {
  search?: string;
  limit?: number;
}): Promise<MeasurementSheetListEntry[]> {
  if (!isMeasurementsDbConfigured()) return [];

  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
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
    group_count: string;
    unit_count: string;
    line_prices: (string | null)[] | null;
  }>(
    `WITH latest AS (
       SELECT DISTINCT ON (opportunity_id) *
       FROM measurement_sheet
       ORDER BY opportunity_id, version DESC
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
     ORDER BY l.created_at DESC
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
    technicianName: r.technician_name,
    visitAt: r.visit_at ? new Date(r.visit_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
    groupCount: Number(r.group_count) || 0,
    unitCount: Number(r.unit_count) || 0,
    totalPriceEur: sumMeasurementLinePrices(r.line_prices ?? []),
  }));
}

export async function listSheetVersions(opportunityId: string): Promise<
  Array<{ sheetId: string; version: number; createdAt: string; technicianName?: string }>
> {
  if (!isMeasurementsDbConfigured()) return [];
  const rows = await measurementsQuery<{
    id: string;
    version: number;
    created_at: Date;
    technician_name: string | null;
  }>(
    `SELECT id, version, created_at, technician_name
     FROM measurement_sheet
     WHERE opportunity_id = $1
     ORDER BY version DESC`,
    [opportunityId]
  );
  return rows.map((r) => ({
    sheetId: r.id,
    version: r.version,
    createdAt: new Date(r.created_at).toISOString(),
    technicianName: r.technician_name ?? undefined,
  }));
}

export async function patchMeasurementLinePrices(
  sheetId: string,
  updates: Array<{ lineId: string; price: string | null }>
): Promise<{ success: true } | { success: false; error: string }> {
  if (!isMeasurementsDbConfigured()) {
    return { success: false, error: "Base de dados de medições indisponível." };
  }
  if (updates.length === 0) {
    return { success: true };
  }

  try {
    await withMeasurementsTransaction(async (client) => {
      for (const { lineId, price } of updates) {
        const res = await client.query(
          `UPDATE measurement_line ml
           SET price = $1
           FROM measurement_group mg
           WHERE ml.id = $2
             AND ml.group_id = mg.id
             AND mg.sheet_id = $3`,
          [price?.trim() ? price.trim() : null, lineId, sheetId]
        );
        if (res.rowCount !== 1) {
          throw new Error("Linha de medição não encontrada nesta ficha.");
        }
      }
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao guardar preços.";
    return { success: false, error: message };
  }
}

export async function getLineById(lineId: string): Promise<MeasurementLineRow | null> {
  if (!isMeasurementsDbConfigured()) return null;
  const rows = await measurementsQuery<MeasurementLineRow>(
    `SELECT * FROM measurement_line WHERE id = $1`,
    [lineId]
  );
  return rows[0] ?? null;
}

async function getLatestSheetLinesForLock(
  client: PoolClient,
  opportunityId: string
): Promise<Array<{ is_prepared: boolean; warehouse_state: string }>> {
  const sheetRes = await client.query<{ id: string }>(
    `SELECT id FROM measurement_sheet
     WHERE opportunity_id = $1
     ORDER BY version DESC
     LIMIT 1`,
    [opportunityId]
  );
  const sheetId = sheetRes.rows[0]?.id;
  if (!sheetId) return [];
  const lines = await client.query<{ is_prepared: boolean; warehouse_state: string }>(
    `SELECT ml.is_prepared, ml.warehouse_state
     FROM measurement_line ml
     INNER JOIN measurement_group mg ON mg.id = ml.group_id
     WHERE mg.sheet_id = $1`,
    [sheetId]
  );
  return lines.rows;
}

function parseRowNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function saveSubmittedSheet(
  input: SaveSubmittedSheetInput
): Promise<SaveSubmittedSheetResult> {
  if (!isMeasurementsDbConfigured()) {
    return { success: false, error: "Base de dados de medições indisponível." };
  }

  if (input.clientRequestId) {
    const existing = await measurementsQuery<{ id: string; version: number }>(
      `SELECT id, version FROM measurement_sheet WHERE client_request_id = $1`,
      [input.clientRequestId]
    );
    if (existing[0]) {
      return {
        success: true,
        sheetId: existing[0].id,
        version: existing[0].version,
        idempotent: true,
      };
    }
  }

  try {
    const result = await withMeasurementsTransaction(async (client) => {
      const lockLines = await getLatestSheetLinesForLock(client, input.opportunityId);
      if (opportunityHasWarehouseLock(lockLines)) {
        throw new Error(WAREHOUSE_LOCK_ERROR_MESSAGE);
      }

      const versionRes = await client.query<{ next: number }>(
        `SELECT COALESCE(MAX(version), 0) + 1 AS next
         FROM measurement_sheet WHERE opportunity_id = $1`,
        [input.opportunityId]
      );
      const version = versionRes.rows[0]?.next ?? 1;
      const sheetId = randomUUID();

      await client.query(
        `INSERT INTO measurement_sheet (
          id, opportunity_id, task_id, version, status, client_request_id,
          technician_name, technician_user_id, client_name, nsi, address,
          service_label, visit_at
        ) VALUES ($1,$2,$3,$4,'submitted',$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          sheetId,
          input.opportunityId,
          input.taskId,
          version,
          input.clientRequestId ?? null,
          input.technicianName ?? null,
          input.technicianUserId ?? null,
          input.clientName,
          input.nsi ?? null,
          input.address,
          input.serviceLabel ?? null,
          input.visitAt ?? null,
        ]
      );

      let groupIndex = 0;
      for (const group of input.payload.groups) {
        const details = sanitizeGroupDetailsForType(
          group.type as Parameters<typeof sanitizeGroupDetailsForType>[0],
          group.details
        );
        const groupId = randomUUID();
        const groupExtra = pickGroupExtras(details as Record<string, unknown>);
        await client.query(
          `INSERT INTO measurement_group (
            id, sheet_id, sort_index, product_type, material, other_material,
            model, ral, fabric, reference, activation, observations, group_extra
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)`,
          [
            groupId,
            sheetId,
            groupIndex,
            group.type,
            details.material ?? null,
            details.otherMaterial ?? null,
            details.model ?? null,
            details.ral ?? null,
            details.fabric ?? null,
            details.reference ?? null,
            details.activation ?? null,
            details.observations ?? null,
            JSON.stringify(groupExtra),
          ]
        );

        let lineIndex = 0;
        for (const m of group.measurements) {
          const synced = syncMeasurementRowLegacyFields({
            qty: m.qty,
            width: String(m.width ?? ""),
            height: String(m.height ?? ""),
            notes: m.notes ?? "",
            fixation: m.fixation ?? "",
            controls: m.controls ?? "",
            price: m.price != null ? String(m.price) : "",
            divisionCode: m.divisionCode,
            divisionCustom: m.divisionCustom,
            fixationCodes: m.fixationCodes,
            fixationCustom: m.fixationCustom,
            controlsCodes: m.controlsCodes,
            controlsCustom: m.controlsCustom,
            openingWidth: m.openingWidth,
            openingHeight: m.openingHeight,
            lineCollapsed: m.lineCollapsed,
            lineNotes: m.lineNotes,
          });
          const lineExtra = pickLineExtras(synced as unknown as Record<string, unknown>);
          const lineId = randomUUID();
          await client.query(
            `INSERT INTO measurement_line (
              id, group_id, sort_index, qty, width_mm, height_mm,
              division, fixation, controls, notes, price,
              is_prepared, warehouse_state, line_extra
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)`,
            [
              lineId,
              groupId,
              lineIndex,
              parseRowNumber(synced.qty),
              parseRowNumber(synced.width),
              parseRowNumber(synced.height),
              synced.notes?.trim() || null,
              synced.fixation?.trim() || null,
              synced.controls?.trim() || null,
              synced.lineNotes?.trim() || null,
              synced.price != null && String(synced.price).trim() !== ""
                ? String(synced.price)
                : null,
              false,
              WAREHOUSE_STATUS.EM_PREPARACAO,
              JSON.stringify(lineExtra),
            ]
          );
          lineIndex += 1;
        }
        groupIndex += 1;
      }

      const outboxPayload = {
        taskId: input.taskId,
        opportunityId: input.opportunityId,
        measurements: input.payload,
        clientName: input.clientName,
        nsi: input.nsi,
        address: input.address,
        clientRequestId: input.clientRequestId,
      };

      await client.query(
        `INSERT INTO measurements_outbox (id, sheet_id, event_type, payload, client_request_id)
         VALUES ($1,$2,'project_twenty_produtos',$3::jsonb,$4),
                ($5,$2,'n8n_measurements_report',$3::jsonb,$4)
         ON CONFLICT (event_type, sheet_id, client_request_id) DO NOTHING`,
        [
          randomUUID(),
          sheetId,
          JSON.stringify(outboxPayload),
          input.clientRequestId ?? null,
          randomUUID(),
        ]
      );

      return { sheetId, version };
    });

    return { success: true, sheetId: result.sheetId, version: result.version };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao guardar medições.";
    return { success: false, error: message };
  }
}

export async function updateLineWarehouseState(
  lineId: string,
  isPrepared: boolean,
  warehouseState: string
): Promise<void> {
  await measurementsQuery(
    `UPDATE measurement_line
     SET is_prepared = $2, warehouse_state = $3
     WHERE id = $1`,
    [lineId, isPrepared, warehouseState]
  );
}

export async function setLineTwentyProdutoId(
  lineId: string,
  twentyProdutoId: string
): Promise<void> {
  await measurementsQuery(
    `UPDATE measurement_line SET twenty_produto_id = $2 WHERE id = $1`,
    [lineId, twentyProdutoId]
  );
}

export type PendingOutboxRow = {
  id: string;
  sheet_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  client_request_id: string | null;
};

export async function fetchPendingOutboxEvents(limit = 20): Promise<PendingOutboxRow[]> {
  if (!isMeasurementsDbConfigured()) return [];
  return measurementsQuery<PendingOutboxRow>(
    `SELECT id, sheet_id, event_type, payload, client_request_id
     FROM measurements_outbox
     WHERE processed_at IS NULL
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
}

export async function markOutboxProcessed(id: string): Promise<void> {
  await measurementsQuery(
    `UPDATE measurements_outbox SET processed_at = NOW(), last_error = NULL WHERE id = $1`,
    [id]
  );
}

export async function markOutboxFailed(id: string, error: string): Promise<void> {
  await measurementsQuery(
    `UPDATE measurements_outbox SET last_error = $2 WHERE id = $1`,
    [id, error.slice(0, 2000)]
  );
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
       ORDER BY opportunity_id, version DESC
     )
     SELECT
       (SELECT COUNT(*)::text FROM latest) AS obras,
       (SELECT COUNT(*)::text FROM measurement_sheet) AS fichas,
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
     LEFT JOIN measurement_sheet ms ON (ms.created_at AT TIME ZONE 'UTC')::date = d.day::date
     GROUP BY d.day
     ORDER BY d.day ASC`
  );

  const techRows = await measurementsQuery<{ name: string; count: string }>(
    `WITH latest AS (
       SELECT DISTINCT ON (opportunity_id) technician_name
       FROM measurement_sheet
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
    porTecnico: techRows.map((r) => ({
      name: r.name,
      count: Number(r.count) || 0,
    })),
  };
}
