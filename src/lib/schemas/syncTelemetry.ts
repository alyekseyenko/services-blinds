import { z } from "zod";

export const SyncFailedItemSchema = z.object({
  action: z.enum(["UPDATE_STATUS", "SAVE_MEASUREMENTS", "ADD_NOTE", "CREATE_VISIT_SERVICE"]),
  taskId: z.string().min(1),
  lastError: z.string().optional(),
  retries: z.number().int().min(0).optional(),
  timestamp: z.number().int(),
});

export const SyncTelemetryReportSchema = z.object({
  technicianId: z.string().min(1),
  technicianName: z.string().min(1),
  pendingCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  isOnline: z.boolean(),
  lastSyncSuccess: z.number().nullable().optional(),
  failedItems: z.array(SyncFailedItemSchema).max(25).optional(),
});

export type SyncTelemetryReport = z.infer<typeof SyncTelemetryReportSchema>;
export type SyncFailedItem = z.infer<typeof SyncFailedItemSchema>;

export interface TechnicianSyncTelemetry extends SyncTelemetryReport {
  lastReportAt: string;
}

export interface SyncTelemetrySummary {
  technicianCount: number;
  totalPending: number;
  totalFailed: number;
  techniciansWithFailures: number;
  technicians: TechnicianSyncTelemetry[];
}
