import { z } from "zod";
import { VisitServiceModeEnum } from "@/lib/schemas";

export const InAppNotificationKindSchema = z.enum([
  "agenda",
  "observability",
]);

export const AgendaDiffKindSchema = z.enum([
  "nova",
  "reagendada",
  "cancelada",
  "concluida",
  "incompleta",
  "em_curso",
  "removida",
  "reatribuida",
  "atrasada",
  "servico_extra",
  "armazem_pronto",
  "medicoes_guardadas",
]);

export const OnSiteServiceSnapshotSchema = z.object({
  opportunityId: z.string().min(1),
  serviceType: z.string(),
  mode: VisitServiceModeEnum,
});

export const AgendaNotificationVisitSchema = z.object({
  clientName: z.string().optional(),
  nsi: z.string().optional(),
  visitTitle: z.string().optional(),
  technicianName: z.string().optional(),
  dueAtIso: z.string().optional(),
  serviceType: z.string().optional(),
});

export const AgendaTimelineEntrySchema = z.object({
  kind: AgendaDiffKindSchema,
  at: z.number(),
  detail: z.string().optional(),
  cycleBreak: z.boolean().optional(),
});

export const AgendaSnapshotItemSchema = z.object({
  id: z.string().min(1),
  dueAt: z.string(),
  status: z.string(),
  label: z.string(),
  clientName: z.string().optional(),
  nsi: z.string().optional(),
  visitTitle: z.string().optional(),
  opportunityId: z.string().optional(),
  technicianName: z.string().optional(),
  assigneeId: z.string().optional(),
  onSiteOpportunityIds: z.array(z.string()).optional(),
  onSiteServices: z.array(OnSiteServiceSnapshotSchema).optional(),
  statusNote: z.string().optional(),
  serviceType: z.string().optional(),
});

export const InAppNotificationSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  createdAt: z.number(),
  read: z.boolean(),
  taskId: z.string().optional(),
  dueAtIso: z.string().optional(),
  opportunityId: z.string().optional(),
  taskStatus: z.string().optional(),
  agendaKind: AgendaDiffKindSchema.optional(),
  /** Estados já vistos neste aviso (legado — migrado para agendaTimeline). */
  agendaProgress: z.array(AgendaDiffKindSchema).optional(),
  visit: AgendaNotificationVisitSchema.optional(),
  agendaTimeline: z.array(AgendaTimelineEntrySchema).optional(),
  notificationKind: InAppNotificationKindSchema.optional(),
  href: z.string().optional(),
});

export type InAppNotificationFromSchema = z.infer<typeof InAppNotificationSchema>;
export type AgendaSnapshotItemFromSchema = z.infer<typeof AgendaSnapshotItemSchema>;
