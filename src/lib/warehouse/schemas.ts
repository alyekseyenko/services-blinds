import { z } from "zod";

export const WarehouseItemStatusSchema = z.enum([
  "EM_PREPARACAO",
  "PREPARADO",
  "FALTA_DE_MATERIAL",
  "PROBLEMAS",
]);

export type WarehouseItemStatus = z.infer<typeof WarehouseItemStatusSchema>;
