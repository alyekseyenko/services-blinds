import { z } from "zod";
import { CRM_STAGES, CRM_TASK_STATUS } from "../crm/contract";

// --- Enums and Shared Types ---
export const OpportunityStageEnum = z.enum([
  CRM_STAGES.ENTRADA,
  CRM_STAGES.TIRAR_MEDIDAS,
  CRM_STAGES.ORCAMENTAR,
  CRM_STAGES.PROPOSTA,
  CRM_STAGES.PAGAMENTO_30,
  CRM_STAGES.ENCOMENDA,
  CRM_STAGES.PREPARACAO,
  CRM_STAGES.MARCAR_INSTALACAO,
  CRM_STAGES.AGENDAR_INSTALACAO,
  CRM_STAGES.INSTALACAO,
  CRM_STAGES.PAGAMENTO_TOTAL,
  CRM_STAGES.CONCLUIDO
]);

export const TaskStatusEnum = z.enum([
  CRM_TASK_STATUS.AGENDADO,
  CRM_TASK_STATUS.EM_CURSO,
  CRM_TASK_STATUS.CONCLUIDO,
  CRM_TASK_STATUS.INCOMPLETO,
  CRM_TASK_STATUS.CANCELADO
]);

// --- Base Entities ---

export const ServiceItemSchema = z.object({
  opportunityId: z.string().uuid(),
  product: z.string().min(1, "Product name is required"),
  width: z.number().positive("Width must be positive"),
  height: z.number().positive("Height must be positive"),
  qty: z.number().int().positive("Quantity must be positive"),
  color: z.string().optional(),
  location: z.string().optional(),
  activation: z.string().optional(),
  material: z.string().optional(),
  fabric: z.string().optional(),
  reference: z.string().optional(),
  fixation: z.string().optional(),
  controls: z.string().optional(),
  isPrepared: z.boolean().default(false)
});

// A group of service items (typically how the UI sends them)
export const ServiceItemGroupSchema = z.object({
  type: z.string(),
  details: z.object({
    material: z.string().optional(),
    ral: z.string().optional(),
    activation: z.string().optional(),
    model: z.string().optional(),
    observations: z.string().optional()
  }).optional(),
  measurements: z.array(z.object({
    id: z.string().optional(),
    qty: z.union([z.string(), z.number()]).transform(val => Number(val)),
    width: z.union([z.string(), z.number()]).transform(val => Number(val)),
    height: z.union([z.string(), z.number()]).transform(val => Number(val)),
    notes: z.string().optional(),
    fixation: z.string().optional(),
    controls: z.string().optional(),
    isPrepared: z.boolean().optional()
  }))
});

export const MeasurementsPayloadSchema = z.object({
  groups: z.array(ServiceItemGroupSchema)
});

// --- Distributed Sync & Conflict Detection ---

export const VersionedEntitySchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative().default(1),
  updatedAt: z.string(),
  clientUpdatedAt: z.string().optional(),
});

export const SyncConflictSchema = z.object({
  entityId: z.string(),
  entityType: z.enum(["TASK", "OPPORTUNITY", "MEASUREMENT"]),
  serverVersion: z.number().int(),
  clientVersion: z.number().int(),
  serverState: z.record(z.string(), z.any()),
  clientState: z.record(z.string(), z.any()),
  conflictResolution: z.enum(["SERVER_WINS", "CLIENT_WINS", "MANUAL_MERGE"]).default("MANUAL_MERGE"),
});

export type OpportunityStage = z.infer<typeof OpportunityStageEnum>;
export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type ServiceItem = z.infer<typeof ServiceItemSchema>;
export type ServiceItemGroup = z.infer<typeof ServiceItemGroupSchema>;
export type MeasurementsPayload = z.infer<typeof MeasurementsPayloadSchema>;
export type VersionedEntity = z.infer<typeof VersionedEntitySchema>;
export type SyncConflict = z.infer<typeof SyncConflictSchema>;

export * from "./ceoMetrics";
export * from "./auth";

