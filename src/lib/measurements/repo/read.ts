import "server-only";
import type { MeasurementsPayload } from "@/lib/schemas";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { isMeasurementsDbConfigured, measurementsQuery } from "../db/client";
import { buildMeasurementSheetFromDb } from "../toSheet";
import type { MeasurementGroupRow, MeasurementLineRow, MeasurementSheetRow } from "../types";
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
    `SELECT * FROM measurement_sheet WHERE id = $1 AND deleted_at IS NULL`,
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
     WHERE opportunity_id = $1 AND deleted_at IS NULL
     ORDER BY version DESC
     LIMIT 1`,
    [opportunityId]
  );
  const sheet = sheets[0];
  if (!sheet) return null;
  const { groups, linesByGroup } = await loadGroupsAndLines(sheet.id);
  const { sheetRowsToMeasurementsPayload } = await import("../toPayload");
  return sheetRowsToMeasurementsPayload(groups, linesByGroup);
}

export async function getLatestSheetMeta(opportunityId: string): Promise<{
  taskId: string;
  version: number;
  technicianName: string | null;
  technicianUserId: string | null;
} | null> {
  if (!isMeasurementsDbConfigured()) return null;
  const sheets = await measurementsQuery<{
    task_id: string;
    version: number;
    technician_name: string | null;
    technician_user_id: string | null;
  }>(
    `SELECT task_id, version, technician_name, technician_user_id
     FROM measurement_sheet
     WHERE opportunity_id = $1 AND deleted_at IS NULL
     ORDER BY version DESC
     LIMIT 1`,
    [opportunityId]
  );
  const sheet = sheets[0];
  if (!sheet?.task_id) return null;
  return {
    taskId: sheet.task_id,
    version: sheet.version,
    technicianName: sheet.technician_name,
    technicianUserId: sheet.technician_user_id,
  };
}

export async function getLatestSheetByOpportunity(
  opportunityId: string
): Promise<(MeasurementSheet & { sheetId: string; version: number }) | null> {
  if (!isMeasurementsDbConfigured()) return null;
  const sheets = await measurementsQuery<MeasurementSheetRow>(
    `SELECT * FROM measurement_sheet
     WHERE opportunity_id = $1 AND deleted_at IS NULL
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
     WHERE opportunity_id = $1 AND version = $2 AND deleted_at IS NULL`,
    [opportunityId, version]
  );
  const sheet = sheets[0];
  if (!sheet) return null;
  const { groups, linesByGroup } = await loadGroupsAndLines(sheet.id);
  return buildMeasurementSheetFromDb(sheet, groups, linesByGroup);
}
export async function listSheetVersions(opportunityId: string): Promise<
  Array<{
    sheetId: string;
    version: number;
    createdAt: string;
    visitAt?: string;
    technicianName?: string;
    editedByName?: string;
  }>
> {
  if (!isMeasurementsDbConfigured()) return [];
  const rows = await measurementsQuery<{
    id: string;
    version: number;
    created_at: Date;
    visit_at: Date | null;
    technician_name: string | null;
    edited_by_name: string | null;
  }>(
    `SELECT id, version, created_at, visit_at, technician_name, edited_by_name
     FROM measurement_sheet
     WHERE opportunity_id = $1 AND deleted_at IS NULL
     ORDER BY version DESC`,
    [opportunityId]
  );
  return rows.map((r) => ({
    sheetId: r.id,
    version: r.version,
    createdAt: new Date(r.created_at).toISOString(),
    visitAt: r.visit_at ? new Date(r.visit_at).toISOString() : undefined,
    technicianName: r.technician_name ?? undefined,
    editedByName: r.edited_by_name?.trim() || undefined,
  }));
}

export async function getLineById(lineId: string): Promise<MeasurementLineRow | null> {
  if (!isMeasurementsDbConfigured()) return null;
  const rows = await measurementsQuery<MeasurementLineRow>(
    `SELECT * FROM measurement_line WHERE id = $1`,
    [lineId]
  );
  return rows[0] ?? null;
}