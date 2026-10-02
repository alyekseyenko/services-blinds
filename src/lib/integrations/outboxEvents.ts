import { z } from "zod";

/** Version bump when breaking n8n payload shape. */
export const OUTBOX_SCHEMA_VERSION = 1;

export const OUTBOX_EVENT_TYPES = [
  "appointment_scheduled",
  "appointment_cancelled_by_client",
  "appointment_cancelled_in_crm",
  "appointment_cancelled_by_admin",
  "MEASUREMENTS_REPORT_GENERATION",
  "SERVICE_REPORT_SUBMITTED",
  "technician_report",
  "service_completed",
  "technician_login",
] as const;

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number];

const schemaVersionField = z.literal(OUTBOX_SCHEMA_VERSION).default(OUTBOX_SCHEMA_VERSION);

const notificationBase = z
  .object({
    schemaVersion: schemaVersionField,
    event: z.string(),
    taskId: z.string().optional(),
    opportunityId: z.string().optional(),
    cancelUrl: z.string().optional(),
    evaluationUrl: z.string().optional(),
    baseUrl: z.string().optional(),
  })
  .passthrough();

const appointmentScheduled = notificationBase.extend({
  event: z.literal("appointment_scheduled"),
});

const appointmentCancelled = notificationBase.extend({
  event: z.enum([
    "appointment_cancelled_by_client",
    "appointment_cancelled_in_crm",
    "appointment_cancelled_by_admin",
  ]),
});

const technicianReport = notificationBase.extend({
  event: z.literal("technician_report"),
});

const serviceCompleted = notificationBase.extend({
  event: z.literal("service_completed"),
});

const technicianLogin = notificationBase.extend({
  event: z.literal("technician_login"),
});

const measurementsReport = z
  .object({
    schemaVersion: schemaVersionField,
    taskId: z.string().optional(),
    opportunityId: z.string().optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();

const serviceReport = z
  .object({
    schemaVersion: schemaVersionField,
    taskId: z.string().optional(),
    opportunityId: z.string().optional(),
    clientName: z.string().optional(),
    serviceType: z.string().optional(),
    nsi: z.string().optional(),
    taskTitle: z.string().optional(),
    folderMetadata: z
      .object({
        year: z.string(),
        month: z.string(),
        day: z.string(),
        clientName: z.string(),
        serviceType: z.string(),
        nsi: z.string(),
        taskTitle: z.string(),
      })
      .optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();

export const outboxPayloadSchemas: Record<OutboxEventType, z.ZodType<Record<string, unknown>>> = {
  appointment_scheduled: appointmentScheduled,
  appointment_cancelled_by_client: appointmentCancelled,
  appointment_cancelled_in_crm: appointmentCancelled,
  appointment_cancelled_by_admin: appointmentCancelled,
  technician_report: technicianReport,
  service_completed: serviceCompleted,
  technician_login: technicianLogin,
  MEASUREMENTS_REPORT_GENERATION: measurementsReport,
  SERVICE_REPORT_SUBMITTED: serviceReport,
};

export function isOutboxEventType(value: string): value is OutboxEventType {
  return (OUTBOX_EVENT_TYPES as readonly string[]).includes(value);
}

export function parseOutboxPayload(
  eventType: OutboxEventType,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const schema = outboxPayloadSchemas[eventType];
  const parsed = schema.parse({
    schemaVersion: OUTBOX_SCHEMA_VERSION,
    ...payload,
  });
  return parsed as Record<string, unknown>;
}

export function assertOutboxEventType(eventType: string): OutboxEventType {
  if (!isOutboxEventType(eventType)) {
    throw new Error(`Tipo de evento outbox desconhecido: ${eventType}`);
  }
  return eventType;
}
