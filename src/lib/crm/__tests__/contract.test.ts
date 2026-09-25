import { describe, it, expect } from 'vitest';
import {
  CRM_OBJECTS,
  CRM_FIELDS,
  CRM_STAGES,
  CRM_TASK_STATUS,
  WAREHOUSE_STATUS,
  STAGE_GROUPS,
  normalizeString,
  normalizeTaskStatus,
  toTwentyTaskStatus,
  isTaskActive,
  isTaskPendingConfirmation,
  canClientCancelTask,
  isTaskBlockingSchedule,
  isTaskInProgress,
  isTaskCompleted,
  isTaskCancelled,
  isMeasurementService,
  isInstallationService,
  isAssistanceService,
  isMaintenanceService,
  isRepairService,
  classifyOpportunityWorkflow,
  deriveWorkflowMarkerKey,
  getNextStageOnSchedule,
  getReusableTaskId,
  isNeedsSchedulingStage,
  mapLegacyServiceTypeToStage,
  parseCrmClientRating,
  formatCrmClientRating,
} from '../contract';

describe('CRM Contract Layer', () => {
  it('deve ter todos os objetos e tabelas CRM definidos', () => {
    expect(CRM_OBJECTS.opportunity.queryName).toBe('opportunities');
    expect(CRM_OBJECTS.task.queryName).toBe('tasks');
    expect(CRM_OBJECTS.serviceItem.name).toBe('Produto');
    expect(CRM_OBJECTS.serviceItem.queryName).toBe('produtos');
    expect(CRM_OBJECTS.workspaceMember.queryName).toBe('workspaceMembers');
  });

  it('deve ter todos os campos custom mapeados', () => {
    expect(CRM_FIELDS.opportunity.serviceAddress).toBe('moradaDeServico');
    expect(CRM_FIELDS.task.technicianName).toBe('technicianName');
    expect(CRM_FIELDS.task.repairAddress).toBe('moradaDaReparacao');
    expect(CRM_FIELDS.serviceItem.prepared).toBe('preparado');
    expect(CRM_FIELDS.serviceItem.warehouseState).toBe('estadoDoArmazem');
  });

  describe('parseCrmClientRating', () => {
    it('parses Twenty RATING enum strings and numeric values', () => {
      expect(parseCrmClientRating('RATING_5')).toBe(5);
      expect(parseCrmClientRating('RATING_3')).toBe(3);
      expect(parseCrmClientRating(4)).toBe(4);
      expect(parseCrmClientRating('4')).toBe(4);
      expect(parseCrmClientRating(null)).toBeNull();
      expect(parseCrmClientRating('RATING_0')).toBeNull();
    });
  });

  describe('formatCrmClientRating', () => {
    it('formats ratings for Twenty SELECT/TEXT fields', () => {
      expect(formatCrmClientRating(5)).toBe('RATING_5');
      expect(formatCrmClientRating(1)).toBe('RATING_1');
      expect(() => formatCrmClientRating(0)).toThrow();
    });
  });

  describe('normalizeString', () => {
    it('deve normalizar strings com acentos e caixa mista', () => {
      expect(normalizeString('Concluído')).toBe('CONCLUIDO');
      expect(normalizeString('Tirar Medição')).toBe('TIRAR MEDICAO');
      expect(normalizeString(null)).toBe('');
      expect(normalizeString(undefined)).toBe('');
    });
  });

  describe('normalizeTaskStatus & EM CURSO', () => {
    it('trata EM CURSO (espaço) e EM_CURSO como equivalentes', () => {
      expect(normalizeTaskStatus('EM CURSO')).toBe('EM_CURSO');
      expect(normalizeTaskStatus('Em Curso')).toBe('EM_CURSO');
      expect(toTwentyTaskStatus('EM CURSO')).toBe('EM_CURSO');
      expect(toTwentyTaskStatus('Em Curso')).toBe('EM_CURSO');
    });

    it('identifica tarefas activas e em curso', () => {
      expect(isTaskActive('Agendado')).toBe(true);
      expect(isTaskActive('EM CURSO')).toBe(true);
      expect(isTaskInProgress('EM CURSO')).toBe(true);
      expect(isTaskActive('Concluído')).toBe(false);
      expect(isTaskInProgress('Agendado')).toBe(false);
    });

    it('reutiliza tasks canceladas ou pendentes ao reagendar', () => {
      expect(getReusableTaskId('task-1', 'CANCELADO')).toBe('task-1');
      expect(getReusableTaskId('task-1', 'POR_AGENDAR')).toBe('task-1');
      expect(getReusableTaskId('task-1', 'AGENDADO')).toBeUndefined();
      expect(getReusableTaskId(undefined, 'CANCELADO')).toBeUndefined();
    });

    it('permite cancelamento publico para propostas e visitas activas', () => {
      expect(canClientCancelTask('POR_AGENDAR')).toBe(true);
      expect(canClientCancelTask('AGENDADO')).toBe(true);
      expect(canClientCancelTask('EM_CURSO')).toBe(true);
      expect(canClientCancelTask('CONCLUIDO')).toBe(false);
    });

    it('distingue propostas pendentes de visitas confirmadas', () => {
      expect(isTaskPendingConfirmation('POR_AGENDAR')).toBe(true);
      expect(isTaskPendingConfirmation('Por Agendar')).toBe(true);
      expect(isTaskActive('POR_AGENDAR')).toBe(false);
      expect(isTaskBlockingSchedule('POR_AGENDAR')).toBe(true);
      expect(isTaskBlockingSchedule('AGENDADO')).toBe(true);
      expect(isTaskBlockingSchedule('CANCELADO')).toBe(false);
    });
  });

  describe('isTaskCompleted & isTaskCancelled', () => {
    it('deve reconhecer corretamente tarefas concluídas', () => {
      expect(isTaskCompleted('CONCLUIDO')).toBe(true);
      expect(isTaskCompleted('Concluído')).toBe(true);
      expect(isTaskCompleted('DONE')).toBe(true);
      expect(isTaskCompleted('AGENDADO')).toBe(false);
    });

    it('deve reconhecer corretamente tarefas canceladas', () => {
      expect(isTaskCancelled('CANCELADO')).toBe(true);
      expect(isTaskCancelled('Cancelado')).toBe(true);
      expect(isTaskCancelled('AGENDADO')).toBe(false);
    });
  });

  describe('workflow classification by stage', () => {
    it('identifica medição por estágio ou título', () => {
      expect(isMeasurementService('TIRAR_MEDIDAS')).toBe(true);
      expect(isMeasurementService('REMEDICAO')).toBe(true);
      expect(isMeasurementService(null, 'Medição de Estores')).toBe(true);
      expect(isMeasurementService('ENTRADA', null)).toBe(true);
      expect(isMeasurementService('INSTALACAO')).toBe(false);
    });

    it('identifica instalação por estágio ou título', () => {
      expect(isInstallationService('INSTALACAO')).toBe(true);
      expect(isInstallationService('MARCAR_INSTALACAO')).toBe(true);
      expect(isInstallationService(null, 'Montagem de Estores')).toBe(true);
      expect(isMeasurementService('TIRAR_MEDIDAS')).toBe(true);
      expect(isInstallationService('TIRAR_MEDIDAS')).toBe(false);
    });

    it('identifica manutenção e reparação por estágio', () => {
      expect(isMaintenanceService('MANUTENCAO')).toBe(true);
      expect(isRepairService('REPARACAO')).toBe(true);
      expect(isAssistanceService('MANUTENCAO')).toBe(true);
      expect(isAssistanceService('REPARACAO')).toBe(true);
      expect(isMeasurementService('MANUTENCAO')).toBe(false);
      expect(isInstallationService('REPARACAO')).toBe(false);
    });

    it('prioriza instalação sobre medição quando o estágio é instalação', () => {
      const stage = CRM_STAGES.INSTALACAO;
      expect(classifyOpportunityWorkflow(stage)).toBe('installation');
      expect(isInstallationService(stage)).toBe(true);
      expect(isMeasurementService(stage)).toBe(false);
    });

    it('deriva marker key a partir do estágio', () => {
      expect(deriveWorkflowMarkerKey('MANUTENCAO')).toBe('MANUTENCAO');
      expect(deriveWorkflowMarkerKey('REPARACAO')).toBe('REPARACAO');
      expect(deriveWorkflowMarkerKey('INSTALACAO')).toBe('INSTALACAO');
      expect(deriveWorkflowMarkerKey('TIRAR_MEDIDAS')).toBe('TIRAR_MEDIDAS');
      expect(deriveWorkflowMarkerKey('REAGENDAR', 'Visita cliente')).toBe('REAGENDAR');
    });
  });

  describe('isNeedsSchedulingStage', () => {
    it('includes all NEEDS_SCHEDULING stages and assistance', () => {
      expect(isNeedsSchedulingStage('ENTRADA')).toBe(true);
      expect(isNeedsSchedulingStage('AGENDAR_INSTALACAO')).toBe(true);
      expect(isNeedsSchedulingStage('MANUTENCAO')).toBe(true);
      expect(isNeedsSchedulingStage('REPARACAO')).toBe(true);
      expect(isNeedsSchedulingStage('REMEDICAO')).toBe(true);
      expect(isNeedsSchedulingStage('PAGAMENTO_TOTAL')).toBe(false);
    });
  });

  describe('getNextStageOnSchedule', () => {
    it('deve avançar ENTRADA para TIRAR_MEDIDAS', () => {
      expect(getNextStageOnSchedule('ENTRADA')).toBe(CRM_STAGES.TIRAR_MEDIDAS);
    });

    it('deve avançar MARCAR_INSTALACAO para INSTALACAO', () => {
      expect(getNextStageOnSchedule('MARCAR_INSTALACAO')).toBe(CRM_STAGES.INSTALACAO);
      expect(getNextStageOnSchedule('AGENDAR_INSTALACAO')).toBe(CRM_STAGES.INSTALACAO);
    });

    it('deve manter o estágio se for Remedição', () => {
      expect(getNextStageOnSchedule('REMEDICAO')).toBe('REMEDICAO');
    });

    it('deve manter MANUTENCAO e REPARACAO ao agendar', () => {
      expect(getNextStageOnSchedule('MANUTENCAO')).toBe('MANUTENCAO');
      expect(getNextStageOnSchedule('REPARACAO')).toBe('REPARACAO');
    });
  });

  describe('mapLegacyServiceTypeToStage', () => {
    it('mapeia tipos legados para novas etapas', () => {
      expect(mapLegacyServiceTypeToStage(['MANUTENCAO'], 'PROPOSTA')).toBe(CRM_STAGES.MANUTENCAO);
      expect(mapLegacyServiceTypeToStage(['REPARACAO'], 'PROPOSTA')).toBe(CRM_STAGES.REPARACAO);
      expect(mapLegacyServiceTypeToStage(['REMEDICAO'], 'ENTRADA')).toBe(CRM_STAGES.REMEDICAO);
      expect(mapLegacyServiceTypeToStage(['INSTALACAO'], 'PROPOSTA')).toBe(CRM_STAGES.MARCAR_INSTALACAO);
    });
  });
});
