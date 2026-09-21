import { z } from 'zod';
import { CRM_TASK_STATUS } from './contract';

export const TaskStatusSchema = z.enum([
  CRM_TASK_STATUS.AGENDADO,
  CRM_TASK_STATUS.EM_CURSO,
  CRM_TASK_STATUS.CONCLUIDO,
  CRM_TASK_STATUS.INCOMPLETO,
  CRM_TASK_STATUS.CANCELADO,
  'Agendado',
  'Em Curso',
  'EM CURSO',
  'Concluído',
  'Incompleto',
  'Cancelado',
]);

export const CoordinateSchema = z.tuple([z.number(), z.number()]).nullable();

export const CRMTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: TaskStatusSchema,
  dueAt: z.string().or(z.date()),
  moradaDaReparacao: z.object({
    addressStreet1: z.string().optional().nullable(),
    addressCity: z.string().optional().nullable(),
    addressLat: z.number().optional().nullable(),
    addressLng: z.number().optional().nullable(),
  }).optional().nullable(),
  bodyV2: z.object({
    markdown: z.string().optional().nullable(),
  }).optional().nullable(),
  technicianName: z.string().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  scheduledBy: z.string().optional().nullable(),
});

export type CRMTask = z.infer<typeof CRMTaskSchema>;

export interface AppTask {
  id: string;
  twentyId: string;
  title: string;
  status: string;
  dueDate: Date;
  address: string;
  coordinates: [number, number] | null;
  client: string;
  clientPhone?: string | null;
  clientPhones?: string[];
  report: string;
  opportunityId?: string;
  nsi?: string;
  stage?: string;
  serviceType?: string;
  scheduledBy: string;
  assigneeId?: string | null;
  technicianName?: string | null;
  isOverdue?: boolean;
}
