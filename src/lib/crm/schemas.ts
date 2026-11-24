import { z } from 'zod';
import { CRM_TASK_STATUS } from './contract';
import type { VisitService } from '@/lib/schemas';

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
  horaDeFim: z.string().or(z.date()).optional().nullable(),
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
  /** Calendário do técnico: fim do bloco (CRM ou +1 h). */
  visitEndAt?: Date;
  address: string;
  /** Rua, cidade e código postal. Sem andar. Usado no GPS. */
  navigationAddress?: string;
  coordinates: [number, number] | null;
  client: string;
  /** NIF da pessoa associada (Twenty `nif`). */
  clientNif?: string | null;
  clientPhone?: string | null;
  clientPhones?: string[];
  /** Estrelas deixadas pelo cliente (1–5). */
  clientRating?: number;
  /** Comentário da avaliação, quando existe. */
  clientFeedback?: string;
  report: string;
  opportunityId?: string;
  nsi?: string;
  /** Número de serviço automático do Twenty (`numeroDeServico`). */
  serviceNumber?: string;
  stage?: string;
  serviceType?: string;
  scheduledBy: string;
  assigneeId?: string | null;
  technicianName?: string | null;
  isOverdue?: boolean;
  services?: VisitService[];
  personId?: string;
  /** CRM `updatedAt` — ordenar histórico por encerramento recente. */
  updatedAt?: Date;
}
