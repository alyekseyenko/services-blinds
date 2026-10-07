import { z } from "zod";

export const AdminMeasurementsDailyPointSchema = z.object({
  date: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
});

export const AdminMeasurementsTechnicianPointSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
});

export const AdminMeasurementsDashboardStatsSchema = z.object({
  configured: z.boolean(),
  obrasComMedicoes: z.number().int().nonnegative(),
  totalUnidades: z.number().int().nonnegative(),
  fichasRegistadas: z.number().int().nonnegative(),
  remedicoes: z.number().int().nonnegative(),
  ultimos14Dias: z.array(AdminMeasurementsDailyPointSchema),
  porTecnico: z.array(AdminMeasurementsTechnicianPointSchema),
});

export type AdminMeasurementsDashboardStats = z.infer<
  typeof AdminMeasurementsDashboardStatsSchema
>;
