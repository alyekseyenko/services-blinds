import { z } from "zod";
import { VisitServiceModeEnum } from "@/lib/schemas";

export const AdminAgendaFeedOnSiteServiceSchema = z.object({
  opportunityId: z.string().min(1),
  serviceType: z.string(),
  mode: VisitServiceModeEnum,
});

export const AdminAgendaFeedTaskSchema = z.object({
  id: z.string().min(1),
  status: z.string(),
  dueAt: z.string().nullable(),
  assigneeId: z.string().nullable(),
  technicianName: z.string().nullable(),
  scheduledBy: z.string().optional(),
  client: z.string().optional(),
  nsi: z.string().optional(),
  visitTitle: z.string().optional(),
  opportunityId: z.string().optional(),
  onSiteOpportunityIds: z.array(z.string()),
  onSiteServices: z.array(AdminAgendaFeedOnSiteServiceSchema).optional(),
  statusNote: z.string().optional(),
  serviceType: z.string().optional(),
});

export const AdminAgendaFeedPipelineItemSchema = z.object({
  opportunityId: z.string().min(1),
  stage: z.string(),
  label: z.string(),
});

export const AdminAgendaFeedSchema = z.object({
  tasks: z.array(AdminAgendaFeedTaskSchema),
  pipeline: z.array(AdminAgendaFeedPipelineItemSchema),
});

export type AdminAgendaFeedFromSchema = z.infer<typeof AdminAgendaFeedSchema>;
