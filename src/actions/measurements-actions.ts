"use server";

import * as measurementQueries from "./measurements/queryActions";
import * as measurementMutations from "./measurements/mutationActions";

export type { MeasurementPipelineServiceHit } from "./measurements/queryActions";

export async function getMeasurementSheetAction(
  ...args: Parameters<typeof measurementQueries.getMeasurementSheetAction>
) {
  return measurementQueries.getMeasurementSheetAction(...args);
}

export async function getMeasurementSheetByIdAction(
  ...args: Parameters<typeof measurementQueries.getMeasurementSheetByIdAction>
) {
  return measurementQueries.getMeasurementSheetByIdAction(...args);
}

export async function listMeasurementSheetsAction(
  ...args: Parameters<typeof measurementQueries.listMeasurementSheetsAction>
) {
  return measurementQueries.listMeasurementSheetsAction(...args);
}

export async function listMeasurementVersionsAction(
  ...args: Parameters<typeof measurementQueries.listMeasurementVersionsAction>
) {
  return measurementQueries.listMeasurementVersionsAction(...args);
}

export async function getAdminMeasurementsDashboardAction(
  ...args: Parameters<typeof measurementQueries.getAdminMeasurementsDashboardAction>
) {
  return measurementQueries.getAdminMeasurementsDashboardAction(...args);
}

export async function getMeasurementsPayloadForOpportunityAction(
  ...args: Parameters<typeof measurementQueries.getMeasurementsPayloadForOpportunityAction>
) {
  return measurementQueries.getMeasurementsPayloadForOpportunityAction(...args);
}

export async function updateMeasurementSheetPricesAction(
  ...args: Parameters<typeof measurementQueries.updateMeasurementSheetPricesAction>
) {
  return measurementQueries.updateMeasurementSheetPricesAction(...args);
}

export async function getServiceItemsByOpportunityAction(
  ...args: Parameters<typeof measurementQueries.getServiceItemsByOpportunityAction>
) {
  return measurementQueries.getServiceItemsByOpportunityAction(...args);
}

export async function getTechnicianMeasurementFichaAction(
  ...args: Parameters<typeof measurementQueries.getTechnicianMeasurementFichaAction>
) {
  return measurementQueries.getTechnicianMeasurementFichaAction(...args);
}

export async function searchPipelineServicesForMeasurementsAction(
  ...args: Parameters<typeof measurementQueries.searchPipelineServicesForMeasurementsAction>
) {
  return measurementQueries.searchPipelineServicesForMeasurementsAction(...args);
}

export async function getAdminMeasurementSeedPayloadAction(
  ...args: Parameters<typeof measurementQueries.getAdminMeasurementSeedPayloadAction>
) {
  return measurementQueries.getAdminMeasurementSeedPayloadAction(...args);
}

export async function getAdminMeasurementPayloadAction(
  ...args: Parameters<typeof measurementQueries.getAdminMeasurementPayloadAction>
) {
  return measurementQueries.getAdminMeasurementPayloadAction(...args);
}

export async function listDeletedMeasurementSheetsAction(
  ...args: Parameters<typeof measurementQueries.listDeletedMeasurementSheetsAction>
) {
  return measurementQueries.listDeletedMeasurementSheetsAction(...args);
}

export async function submitMeasurementsAction(
  ...args: Parameters<typeof measurementMutations.submitMeasurementsAction>
) {
  return measurementMutations.submitMeasurementsAction(...args);
}

export async function saveAdminManualMeasurementsAction(
  ...args: Parameters<typeof measurementMutations.saveAdminManualMeasurementsAction>
) {
  return measurementMutations.saveAdminManualMeasurementsAction(...args);
}

export async function saveAdminMeasurementRevisionAction(
  ...args: Parameters<typeof measurementMutations.saveAdminMeasurementRevisionAction>
) {
  return measurementMutations.saveAdminMeasurementRevisionAction(...args);
}

export async function deleteAdminMeasurementSheetsAction(
  ...args: Parameters<typeof measurementMutations.deleteAdminMeasurementSheetsAction>
) {
  return measurementMutations.deleteAdminMeasurementSheetsAction(...args);
}

export async function deleteAdminMeasurementSheetsBulkAction(
  ...args: Parameters<typeof measurementMutations.deleteAdminMeasurementSheetsBulkAction>
) {
  return measurementMutations.deleteAdminMeasurementSheetsBulkAction(...args);
}

export async function restoreAdminMeasurementSheetsBulkAction(
  ...args: Parameters<typeof measurementMutations.restoreAdminMeasurementSheetsBulkAction>
) {
  return measurementMutations.restoreAdminMeasurementSheetsBulkAction(...args);
}