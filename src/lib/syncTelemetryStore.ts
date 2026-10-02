import type { SyncTelemetryReport, SyncTelemetrySummary, TechnicianSyncTelemetry } from "@/lib/schemas/syncTelemetry";

const STALE_MS = 24 * 60 * 60 * 1000;
const memoryStore = new Map<string, TechnicianSyncTelemetry>();

export const syncTelemetryStore = {
  upsert(report: SyncTelemetryReport): TechnicianSyncTelemetry {
    const entry: TechnicianSyncTelemetry = {
      ...report,
      lastReportAt: new Date().toISOString(),
    };
    memoryStore.set(report.technicianId, entry);
    return entry;
  },

  getSummary(staleThresholdMs = STALE_MS): SyncTelemetrySummary {
    const now = Date.now();
    const technicians: TechnicianSyncTelemetry[] = [];

    memoryStore.forEach((entry, id) => {
      const age = now - new Date(entry.lastReportAt).getTime();
      if (age > staleThresholdMs) {
        memoryStore.delete(id);
        return;
      }
      technicians.push(entry);
    });

    technicians.sort((a, b) => b.failedCount - a.failedCount || b.pendingCount - a.pendingCount);

    const totalPending = technicians.reduce((sum, t) => sum + t.pendingCount, 0);
    const totalFailed = technicians.reduce((sum, t) => sum + t.failedCount, 0);

    return {
      technicianCount: technicians.length,
      totalPending,
      totalFailed,
      techniciansWithFailures: technicians.filter((t) => t.failedCount > 0).length,
      technicians,
    };
  },

  clear(): void {
    memoryStore.clear();
  },
};
