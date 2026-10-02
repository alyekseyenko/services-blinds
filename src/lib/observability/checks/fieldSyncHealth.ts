import { syncTelemetryStore } from "@/lib/syncTelemetryStore";
import { defineE2ECheck } from "../checkHelpers";

const STALE_PENDING_FAIL_MS = 24 * 60 * 60 * 1000;

export const fieldSyncHealthCheck = defineE2ECheck({
  id: "field-sync-health",
  name: "Sincronização dos técnicos",
  category: "APP",
  description: "Telemetria de filas offline dos técnicos",
  tier: "safe",
  covers: ["system:field-sync", "api:/api/sync-telemetry"],
  remediation:
    "Peça aos técnicos para abrir a app online ou inspecione itens falhados na consola.",
  async run() {
    const summary = syncTelemetryStore.getSummary();
    const now = Date.now();

    const stalePending = summary.technicians.some((t) => {
      if (t.pendingCount <= 0) return false;
      const lastSuccess = t.lastSyncSuccess ?? 0;
      return lastSuccess > 0 && now - lastSuccess > STALE_PENDING_FAIL_MS;
    });

    if (stalePending) {
      return {
        status: "FAIL",
        message: "Há filas pendentes há mais de 24 h.",
        details: { ...summary },
      };
    }

    if (summary.totalFailed > 0 || summary.techniciansWithFailures > 0) {
      return {
        status: "WARN",
        message: `${summary.techniciansWithFailures} técnico(s) com itens falhados.`,
        details: { ...summary },
      };
    }

    return {
      status: "PASS",
      message: `Telemetria OK (${summary.technicianCount} técnico(s) reportados).`,
      details: { ...summary },
    };
  },
});
