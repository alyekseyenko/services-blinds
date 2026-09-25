import { cancelAppointmentByClient, updateTaskStatus } from "@/lib/crm/tasks";
import { saveMeasurements } from "@/lib/crm/measurements";
import { submitServiceFeedback } from "@/lib/crm/opportunities";
import { outboxQueue } from "@/lib/outboxQueue";
import type {
  LuxuryWorkflowContext,
  LuxuryWorkflowPhaseResult,
  LuxuryWorkflowScenario,
  LuxuryWorkflowStatus,
} from "../luxuryTypes";
import {
  BRAZIL_SERVICE_TEMPLATES,
  assertClientCannotCancel,
  confirmLuxuryVisit,
  createLuxuryClient,
  createLuxuryOpportunity,
  futureDueAt,
  getTaskStatus,
  resolveLuxuryTechnician,
  scheduleLuxuryVisit,
  trackN8nEvent,
} from "../luxuryHelpers";

async function runPhase(
  id: string,
  name: string,
  category: LuxuryWorkflowPhaseResult["category"],
  fn: () => Promise<{
    message: string;
    status?: LuxuryWorkflowStatus;
    details?: Record<string, unknown>;
  }>
): Promise<LuxuryWorkflowPhaseResult> {
  const start = Date.now();
  try {
    const outcome = await fn();
    return {
      id,
      name,
      category,
      status: outcome.status ?? "PASS",
      latencyMs: Date.now() - start,
      message: outcome.message,
      details: outcome.details,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown phase failure";
    return {
      id,
      name,
      category,
      status: "FAIL",
      latencyMs: Date.now() - start,
      message,
      remediation: "Inspect CRM connectivity, n8n webhooks, and server logs for this phase.",
    };
  }
}

function getService(ctx: LuxuryWorkflowContext, key: string) {
  const service = ctx.artifacts.services.find((s) => s.key === key);
  if (!service) {
    throw new Error(`Service artifact "${key}" was not created in a previous phase.`);
  }
  return service;
}

export const brazilFullWorkflowScenario: LuxuryWorkflowScenario = {
  id: "brazil-full-workflow",
  name: "Brazil Full Workflow (Luxury E2E)",
  description:
    "Creates one client, five Brazil services (all workflow variants), runs scheduling, client portals, technician flows, and all n8n outbox events.",
  n8nEventsCovered: [
    "appointment_scheduled",
    "appointment_cancelled_by_client",
    "MEASUREMENTS_REPORT_GENERATION",
    "service_completed",
    "SERVICE_REPORT_SUBMITTED",
    "technician_report",
  ],
  async run(ctx: LuxuryWorkflowContext): Promise<LuxuryWorkflowPhaseResult[]> {
    const phases: LuxuryWorkflowPhaseResult[] = [];
    const baseNsi = 880000 + Math.floor(Math.random() * 90000);

    phases.push(
      await runPhase("create-client", "Create Luxury Test Client", "CRM", async () => {
        const client = await createLuxuryClient(ctx.artifacts.runId);
        ctx.artifacts.personId = client.personId;
        ctx.artifacts.clientEmail = client.email;
        ctx.artifacts.clientName = client.name;
        return {
          message: `Client created (${client.email}).`,
          details: { personId: client.personId },
        };
      })
    );

    if (!ctx.artifacts.personId) {
      return phases;
    }

    phases.push(
      await runPhase("create-services", "Create Brazil Service Portfolio", "CRM", async () => {
        let offset = 0;
        for (const template of BRAZIL_SERVICE_TEMPLATES) {
          const created = await createLuxuryOpportunity(
            ctx.artifacts.personId!,
            template,
            baseNsi + offset
          );
          ctx.artifacts.services.push({
            key: template.key,
            workflow: template.workflow,
            opportunityId: created.opportunityId,
            nsi: created.nsi,
            stage: template.stage,
            city: template.city,
          });
          offset += 1;
        }
        return {
          message: `Created ${ctx.artifacts.services.length} opportunities across Brazil cities.`,
          details: {
            services: ctx.artifacts.services.map((s) => ({
              key: s.key,
              city: s.city,
              nsi: s.nsi,
            })),
          },
        };
      })
    );

    phases.push(
      await runPhase("resolve-technician", "Resolve Technician", "CRM", async () => {
        const technician = await resolveLuxuryTechnician();
        ctx.artifacts.technicianId = technician.id;
        ctx.artifacts.technicianName = technician.name;
        return {
          message: `Technician resolved: ${technician.name}.`,
          details: technician,
        };
      })
    );

    if (!ctx.artifacts.technicianId || !ctx.artifacts.clientEmail) {
      return phases;
    }

    phases.push(
      await runPhase("schedule-visits", "Schedule Technical Visits", "N8N", async () => {
        const scheduleKeys = ["measurement", "repair", "maintenance", "installation"] as const;
        const technician = {
          id: ctx.artifacts.technicianId!,
          name: ctx.artifacts.technicianName!,
        };

        for (let i = 0; i < scheduleKeys.length; i++) {
          const key = scheduleKeys[i];
          const service = getService(ctx, key);
          const template = BRAZIL_SERVICE_TEMPLATES.find((t) => t.key === key)!;
          const taskId = await scheduleLuxuryVisit({
            actor: ctx.actor,
            technician,
            template,
            opportunityId: service.opportunityId,
            personId: ctx.artifacts.personId!,
            clientEmail: ctx.artifacts.clientEmail!,
            clientName: ctx.artifacts.clientName || "Luxury E2E Client",
            dueAt: futureDueAt(2 + i, 10 + i),
          });
          service.taskId = taskId;
          trackN8nEvent(ctx.artifacts, "appointment_scheduled");
        }

        return {
          message: "Scheduled 4 visits (measurement, repair, maintenance, installation).",
          details: {
            tasks: scheduleKeys.map((key) => ({
              key,
              taskId: getService(ctx, key).taskId,
            })),
          },
        };
      })
    );

    phases.push(
      await runPhase("client-confirm-visits", "Client Confirms Visits", "CRM", async () => {
        const keys = ["measurement", "maintenance", "installation"] as const;
        for (const key of keys) {
          const service = getService(ctx, key);
          if (!service.taskId) throw new Error(`Missing task for ${key}`);
          await confirmLuxuryVisit(service.taskId);
          const status = await getTaskStatus(service.taskId);
          if (status !== "AGENDADO") {
            throw new Error(`Task ${key} expected AGENDADO, got ${status}`);
          }
        }
        return {
          message: "Client confirmed measurement, maintenance, and installation visits.",
          details: { confirmed: keys },
        };
      })
    );

    phases.push(
      await runPhase("client-cancel-repair", "Client Cancels Repair Visit", "N8N", async () => {
        const repair = getService(ctx, "repair");
        if (!repair.taskId) throw new Error("Repair task missing");
        await cancelAppointmentByClient(
          repair.taskId,
          "Luxury E2E: client cannot attend the proposed repair slot."
        );
        trackN8nEvent(ctx.artifacts, "appointment_cancelled_by_client");
        const status = await getTaskStatus(repair.taskId);
        return {
          message: `Repair visit cancelled by client (status: ${status}).`,
          details: { taskId: repair.taskId, status },
        };
      })
    );

    phases.push(
      await runPhase("technician-measurements", "Technician Takes Measurements", "N8N", async () => {
        const measurement = getService(ctx, "measurement");
        if (!measurement.taskId) throw new Error("Measurement task missing");

        await updateTaskStatus(measurement.taskId, "EM_CURSO", "Luxury E2E on-site measurement started.");

        const result = await saveMeasurements(measurement.taskId, measurement.opportunityId, {
          groups: [
            {
              type: "ESTORE_EXTERIOR",
              details: {
                material: "ALUMINIO_TERMICO",
                ral: "7016",
                activation: "MOTOR_RTS",
                model: "E2E Fake Product",
                observations: "Luxury E2E fake measurement product",
              },
              measurements: [
                {
                  qty: 2,
                  width: 1200,
                  height: 1400,
                  notes: "Living room window",
                  fixation: "Ceiling",
                  controls: "Right",
                },
                {
                  qty: 1,
                  width: 800,
                  height: 1200,
                  notes: "Bedroom window",
                  fixation: "Wall",
                  controls: "Left",
                },
              ],
            },
            {
              type: "MOSQUITEIRO",
              details: {
                material: "FIBRA_DE_VIDRO",
                observations: "E2E mosquito net variant",
              },
              measurements: [
                {
                  qty: 1,
                  width: 900,
                  height: 2100,
                  notes: "Balcony door",
                },
              ],
            },
          ],
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to save measurements");
        }
        trackN8nEvent(ctx.artifacts, "MEASUREMENTS_REPORT_GENERATION");

        return {
          message: "Measurements saved with fake products (exterior blind + mosquito net).",
          details: { taskId: measurement.taskId, opportunityId: measurement.opportunityId },
        };
      })
    );

    phases.push(
      await runPhase("technician-complete-measurement", "Complete Measurement Visit", "N8N", async () => {
        const measurement = getService(ctx, "measurement");
        if (!measurement.taskId) throw new Error("Measurement task missing");
        await updateTaskStatus(
          measurement.taskId,
          "Concluído",
          "Luxury E2E measurement visit completed successfully."
        );
        trackN8nEvent(ctx.artifacts, "service_completed");
        trackN8nEvent(ctx.artifacts, "SERVICE_REPORT_SUBMITTED");
        return {
          message: "Measurement visit marked as completed.",
          details: { taskId: measurement.taskId },
        };
      })
    );

    phases.push(
      await runPhase("technician-complete-maintenance", "Complete Maintenance Visit", "N8N", async () => {
        const maintenance = getService(ctx, "maintenance");
        if (!maintenance.taskId) throw new Error("Maintenance task missing");
        await updateTaskStatus(
          maintenance.taskId,
          "Concluído",
          "Luxury E2E maintenance completed — motor lubricated and tested."
        );
        trackN8nEvent(ctx.artifacts, "service_completed");
        trackN8nEvent(ctx.artifacts, "SERVICE_REPORT_SUBMITTED");
        const status = await getTaskStatus(maintenance.taskId);
        return {
          message: `Maintenance visit completed (status: ${status}).`,
          details: { taskId: maintenance.taskId },
        };
      })
    );

    phases.push(
      await runPhase("technician-incomplete-installation", "Incomplete Installation Visit", "N8N", async () => {
        const installation = getService(ctx, "installation");
        if (!installation.taskId) throw new Error("Installation task missing");
        await updateTaskStatus(
          installation.taskId,
          "Incompleto",
          "Luxury E2E: missing bracket hardware — reschedule required."
        );
        trackN8nEvent(ctx.artifacts, "technician_report");
        trackN8nEvent(ctx.artifacts, "SERVICE_REPORT_SUBMITTED");
        return {
          message: "Installation marked incomplete (technician report sent).",
          details: { taskId: installation.taskId },
        };
      })
    );

    phases.push(
      await runPhase("client-cannot-cancel-completed", "Client Cannot Cancel Completed Visit", "PORTALS", async () => {
        const maintenance = getService(ctx, "maintenance");
        if (!maintenance.taskId) throw new Error("Maintenance task missing");
        const status = await getTaskStatus(maintenance.taskId);
        const blocked = assertClientCannotCancel(status);
        if (!blocked) {
          throw new Error(`Expected completed maintenance to block client cancel, status=${status}`);
        }
        return {
          message: "Completed maintenance correctly blocks client cancellation.",
          details: { taskId: maintenance.taskId, status },
        };
      })
    );

    phases.push(
      await runPhase("client-evaluation", "Client Submits Evaluation", "PORTALS", async () => {
        const maintenance = getService(ctx, "maintenance");
        await submitServiceFeedback(
          maintenance.opportunityId,
          5,
          "Luxury E2E: excellent maintenance service, technician was professional."
        );
        return {
          message: "Client evaluation submitted for maintenance service.",
          details: { opportunityId: maintenance.opportunityId, rating: 5 },
        };
      })
    );

    phases.push(
      await runPhase("unscheduled-service", "Forgot-to-Schedule Opportunity", "CRM", async () => {
        const unscheduled = getService(ctx, "unscheduled");
        if (unscheduled.taskId) {
          throw new Error("Unscheduled service should not have a task.");
        }
        return {
          message: "Unscheduled Curitiba opportunity remains without a visit (intentional gap).",
          details: { opportunityId: unscheduled.opportunityId, city: unscheduled.city },
        };
      })
    );

    phases.push(
      await runPhase("outbox-delivery", "Flush Outbox & Verify Delivery", "OUTBOX", async () => {
        const before = outboxQueue.getStats();
        const result = await outboxQueue.processPending();
        const after = outboxQueue.getStats();
        ctx.artifacts.outboxProcessedDelta = result.processed;

        let status: LuxuryWorkflowStatus = "PASS";
        let message = `Outbox flushed: ${result.processed} delivered, ${result.failed} failed, ${result.pruned} stale pruned.`;

        if (after.failed > 0) {
          status = "WARN";
          message = `${after.failed} outbox event(s) failed after flush.`;
        } else if (after.pending > 0) {
          status = "WARN";
          message = `${after.pending} outbox event(s) still pending (likely already delivered on enqueue).`;
        }

        return {
          status,
          message,
          details: { before, after, result },
        };
      })
    );

    phases.push(
      await runPhase("n8n-coverage", "n8n Event Coverage Summary", "N8N", async () => {
        const expected = brazilFullWorkflowScenario.n8nEventsCovered;
        const triggered = ctx.artifacts.n8nEventsTriggered;
        const missing = expected.filter((e) => !triggered.includes(e));

        if (missing.length > 0) {
          throw new Error(`Missing n8n events: ${missing.join(", ")}`);
        }

        return {
          message: `All ${expected.length} n8n event types were triggered during the workflow.`,
          details: { expected, triggered },
        };
      })
    );

    return phases;
  },
};
