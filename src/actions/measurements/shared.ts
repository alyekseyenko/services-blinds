import { isAdminRole } from "@/lib/auth/session";
import { isWarehouseRole } from "@/lib/auth/rbac";
import type { AppRole } from "@/lib/schemas/auth";

export function canViewMeasurementSheets(role: AppRole | undefined): boolean {
  if (!role) return false;
  return isAdminRole(role) || isWarehouseRole(role);
}