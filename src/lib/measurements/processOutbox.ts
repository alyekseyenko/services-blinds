import "server-only";
import { serverTriggerMeasurementsReport } from "@/lib/notificationAction";
import {
  fetchPendingOutboxEvents,
  markOutboxFailed,
  markOutboxProcessed,
} from "./repo";
import { projectTwentyProdutosForSheet } from "./projectTwenty";

export async function processMeasurementsOutboxBatch(): Promise<void> {
  const events = await fetchPendingOutboxEvents(15);
  for (const event of events) {
    try {
      if (event.event_type === "project_twenty_produtos") {
        await projectTwentyProdutosForSheet(event.sheet_id);
      } else if (event.event_type === "n8n_measurements_report") {
        const payload = event.payload as {
          taskId?: string;
          opportunityId?: string;
          measurements?: unknown;
          clientName?: string;
          address?: string;
          nsi?: string;
          clientRequestId?: string;
        };
        await serverTriggerMeasurementsReport({
          taskId: payload.taskId,
          opportunityId: payload.opportunityId,
          measurements: payload.measurements,
          clientName: payload.clientName || "Cliente",
          address: payload.address || "",
          nsi: payload.nsi || "N/A",
          clientRequestId: payload.clientRequestId || event.client_request_id,
        });
      }
      await markOutboxProcessed(event.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markOutboxFailed(event.id, message);
    }
  }
}
