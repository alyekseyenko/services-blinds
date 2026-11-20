import "server-only";
import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import type { MeasurementsPayload } from "@/lib/schemas";
import { sanitizeGroupDetailsForType } from "@/lib/measurements/productDetails";
import { pickGroupExtras, pickLineExtras } from "@/lib/measurements/extendedFields";
import { storedWidthHeightMm } from "@/lib/measurements/lineModes";
import { syncMeasurementRowLegacyFields } from "@/lib/measurements/rowPayload";
import { isMeasurementsDbConfigured, measurementsQuery, withMeasurementsTransaction } from "../db/client";
import { opportunityHasWarehouseLock, WAREHOUSE_LOCK_ERROR_MESSAGE } from "../warehouseLock";
import { WAREHOUSE_STATUS } from "@/lib/crm/contract";

export type SaveSubmittedSheetInput = {
  opportunityId: string;
  taskId: string;
  clientRequestId?: string;
  technicianName?: string;
  technicianUserId?: string;
  editedByName?: string;
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
async function getLatestSheetLinesForLock(
  client: PoolClient,
  opportunityId: string
): Promise<Array<{ is_prepared: boolean; warehouse_state: string }>> {
  const sheetRes = await client.query<{ id: string }>(
    `SELECT id FROM measurement_sheet
     WHERE opportunity_id = $1 AND deleted_at IS NULL
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

export async function deleteMeasurementSheetsForOpportunity(
  opportunityId: string,
  deletedByName: string
): Promise<
  | { success: true; versions: number; clientName: string; latestVersion: number }
  | { success: false; error: string }
> {
  if (!isMeasurementsDbConfigured()) {
    return { success: false, error: "Base de dados de medições indisponível." };
  }
  try {
    return await withMeasurementsTransaction(async (client) => {
      const lines = await getLatestSheetLinesForLock(client, opportunityId);
      if (opportunityHasWarehouseLock(lines)) {
        throw new Error(WAREHOUSE_LOCK_ERROR_MESSAGE);
      }
      const meta = await client.query<{ client_name: string; version: number }>(
        `SELECT client_name, version
         FROM measurement_sheet
         WHERE opportunity_id = $1 AND deleted_at IS NULL
         ORDER BY version DESC`,
        [opportunityId]
      );
      if (meta.rows.length === 0) {
        throw new Error("Não há medições para apagar nesta obra.");
      }
      await client.query(
        `UPDATE measurement_sheet
         SET deleted_at = NOW(), deleted_by_name = $2
         WHERE opportunity_id = $1 AND deleted_at IS NULL`,
        [opportunityId, deletedByName]
      );
      return {
        success: true as const,
        versions: meta.rows.length,
        clientName: meta.rows[0].client_name,
        latestVersion: meta.rows[0].version,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível apagar as medições.";
    return { success: false, error: message };
  }
}

export async function restoreMeasurementSheetsForOpportunity(
  opportunityId: string
): Promise<
  | { success: true; versions: number; clientName: string; latestVersion: number }
  | { success: false; error: string }
> {
  if (!isMeasurementsDbConfigured()) {
    return { success: false, error: "Base de dados de medições indisponível." };
  }
  const rows = await measurementsQuery<{ client_name: string; version: number }>(
    `UPDATE measurement_sheet
     SET deleted_at = NULL, deleted_by_name = NULL
     WHERE opportunity_id = $1 AND deleted_at IS NOT NULL
     RETURNING client_name, version`,
    [opportunityId]
  );
  if (rows.length === 0) {
    return { success: false, error: "Não há medições para recuperar." };
  }
  return {
    success: true,
    versions: rows.length,
    clientName: rows[0].client_name,
    latestVersion: Math.max(...rows.map((row) => row.version)),
  };
}

function parseRowNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

type LatestSheetRow = {
  id: string;
  version: number;
  task_id: string;
  edited_by_name: string | null;
};

/** Decides in-place technician update vs new version (unit-tested). */
export function resolveTechnicianSheetSaveStrategy(input: {
  editedByName?: string;
  taskId: string;
  latestSheet: {
    id: string;
    version: number;
    taskId: string;
    editedByName: string | null;
  } | null;
}): "insert" | "update" {
  if (input.editedByName?.trim()) return "insert";
  if (!input.latestSheet) return "insert";
  if (input.latestSheet.taskId !== input.taskId) return "insert";
  if (input.latestSheet.editedByName?.trim()) return "insert";
  return "update";
}

async function loadLatestSheetRow(
  client: PoolClient,
  opportunityId: string
): Promise<LatestSheetRow | null> {
  const res = await client.query<LatestSheetRow>(
    `SELECT id, version, task_id, edited_by_name
     FROM measurement_sheet
     WHERE opportunity_id = $1 AND deleted_at IS NULL
     ORDER BY version DESC
     LIMIT 1`,
    [opportunityId]
  );
  return res.rows[0] ?? null;
}

async function insertPayloadGroupsAndLines(
  client: PoolClient,
  sheetId: string,
  payload: MeasurementsPayload
): Promise<void> {
  let groupIndex = 0;
  for (const group of payload.groups) {
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
        ...pickLineExtras(m as unknown as Record<string, unknown>),
      });
      const lineExtra = pickLineExtras(synced as unknown as Record<string, unknown>);
      const storedDims = storedWidthHeightMm(synced);
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
          storedDims.width,
          storedDims.height,
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
}

async function enqueueSheetProjectionOutbox(
  client: PoolClient,
  sheetId: string,
  outboxPayload: Record<string, unknown>,
  clientRequestId: string | null
): Promise<void> {
  await client.query(
    `INSERT INTO measurements_outbox (id, sheet_id, event_type, payload, client_request_id)
     VALUES ($1,$2,'project_twenty_produtos',$3::jsonb,$4),
            ($5,$2,'n8n_measurements_report',$3::jsonb,$4)
     ON CONFLICT (event_type, sheet_id, client_request_id) DO NOTHING`,
    [
      randomUUID(),
      sheetId,
      JSON.stringify(outboxPayload),
      clientRequestId,
      randomUUID(),
    ]
  );
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

      const outboxPayload = {
        taskId: input.taskId,
        opportunityId: input.opportunityId,
        measurements: input.payload,
        clientName: input.clientName,
        nsi: input.nsi,
        address: input.address,
        clientRequestId: input.clientRequestId,
      };
      const clientRequestId = input.clientRequestId ?? null;

      const latestRow = await loadLatestSheetRow(client, input.opportunityId);
      const latestForStrategy = latestRow
        ? {
            id: latestRow.id,
            version: latestRow.version,
            taskId: latestRow.task_id,
            editedByName: latestRow.edited_by_name,
          }
        : null;
      const strategy = resolveTechnicianSheetSaveStrategy({
        editedByName: input.editedByName,
        taskId: input.taskId,
        latestSheet: latestForStrategy,
      });

      if (strategy === "update" && latestRow) {
        const sheetId = latestRow.id;
        const version = latestRow.version;

        await client.query(
          `UPDATE measurement_sheet SET
             technician_name = $2,
             technician_user_id = $3,
             client_name = $4,
             nsi = $5,
             address = $6,
             service_label = $7,
             visit_at = $8,
             client_request_id = $9
           WHERE id = $1`,
          [
            sheetId,
            input.technicianName ?? null,
            input.technicianUserId ?? null,
            input.clientName,
            input.nsi ?? null,
            input.address,
            input.serviceLabel ?? null,
            input.visitAt ?? null,
            clientRequestId,
          ]
        );

        await client.query(`DELETE FROM measurement_group WHERE sheet_id = $1`, [sheetId]);
        await insertPayloadGroupsAndLines(client, sheetId, input.payload);
        await enqueueSheetProjectionOutbox(client, sheetId, outboxPayload, clientRequestId);

        return { sheetId, version };
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
          service_label, visit_at, edited_by_name
        ) VALUES ($1,$2,$3,$4,'submitted',$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          sheetId,
          input.opportunityId,
          input.taskId,
          version,
          clientRequestId,
          input.technicianName ?? null,
          input.technicianUserId ?? null,
          input.clientName,
          input.nsi ?? null,
          input.address,
          input.serviceLabel ?? null,
          input.visitAt ?? null,
          input.editedByName?.trim() || null,
        ]
      );

      await insertPayloadGroupsAndLines(client, sheetId, input.payload);
      await enqueueSheetProjectionOutbox(client, sheetId, outboxPayload, clientRequestId);

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