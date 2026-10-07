import { WAREHOUSE_STATUS } from "@/lib/crm/contract";

const BLOCKING_WAREHOUSE_STATES = new Set<string>([
  WAREHOUSE_STATUS.PREPARADO,
  WAREHOUSE_STATUS.PROBLEMAS,
  WAREHOUSE_STATUS.FALTA_DE_MATERIAL,
]);

export type WarehouseLineLockInput = {
  is_prepared: boolean;
  warehouse_state: string;
};

export function opportunityHasWarehouseLock(lines: WarehouseLineLockInput[]): boolean {
  return lines.some(
    (line) =>
      line.is_prepared === true || BLOCKING_WAREHOUSE_STATES.has(line.warehouse_state)
  );
}

export const WAREHOUSE_LOCK_ERROR_MESSAGE =
  "Encomenda já em preparação no armazém. Contacte o armazém antes de alterar as medições.";
