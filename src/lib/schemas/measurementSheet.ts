import { z } from "zod";

export const MeasurementSheetRowSchema = z.object({
  index: z.number().int().positive(),
  lineId: z.string().uuid().optional(),
  division: z.string().optional(),
  qty: z.number(),
  widthMm: z.number(),
  heightMm: z.number(),
  fixation: z.string().optional(),
  controls: z.string().optional(),
  notes: z.string().optional(),
  price: z.string().optional(),
  /** Dimensão do vão (mm), estore exterior completo. */
  openingWidthMm: z.number().int().nonnegative().optional(),
  openingHeightMm: z.number().int().nonnegative().optional(),
  /** Total vão + estore em mm (soma L e A; ex.: 2450×3050 mm). */
  openingDimensionLabel: z.string().optional(),
});

export const MeasurementSheetGroupSchema = z.object({
  productType: z.string(),
  productLabel: z.string(),
  materialLabel: z.string().optional(),
  colorLabel: z.string().optional(),
  fabricLabel: z.string().optional(),
  referenceLabel: z.string().optional(),
  activationLabel: z.string().optional(),
  observations: z.string().optional(),
  exteriorInstallLabel: z.string().optional(),
  partialPartsLabel: z.string().optional(),
  specDetailEntries: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional(),
  rows: z.array(MeasurementSheetRowSchema),
});

export const MeasurementSheetSchema = z.object({
  opportunityId: z.string(),
  clientName: z.string(),
  nsi: z.string().optional(),
  address: z.string(),
  serviceLabel: z.string().optional(),
  technicianName: z.string().optional(),
  visitDateIso: z.string().optional(),
  groups: z.array(MeasurementSheetGroupSchema),
  sheetId: z.string().uuid().optional(),
  version: z.number().int().positive().optional(),
});

export type MeasurementSheetRow = z.infer<typeof MeasurementSheetRowSchema>;
export type MeasurementSheetGroup = z.infer<typeof MeasurementSheetGroupSchema>;
export type MeasurementSheet = z.infer<typeof MeasurementSheetSchema>;

export function measurementSheetHasData(sheet: MeasurementSheet | null | undefined): boolean {
  if (!sheet?.groups?.length) return false;
  return sheet.groups.some((g) =>
    g.rows.some((r) => r.widthMm > 0 && r.heightMm > 0)
  );
}
