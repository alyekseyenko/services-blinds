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
  isTaskInProgress,
  isTaskCompleted,
  isTaskCancelled,
  isMeasurementService,
  isInstallationService,
  getNextStageOnSchedule
} from '../contract';

describe('CRM Contract Layer', () => {
  it('deve ter todos os objetos e tabelas CRM definidos', () => {
    expect(CRM_OBJECTS.opportunity.queryName).toBe('opportunities');
    expect(CRM_OBJECTS.task.queryName).toBe('tasks');
    expect(CRM_OBJECTS.serviceItem.name).toBe('Itemdeservico');
    expect(CRM_OBJECTS.serviceItem.queryName).toBe('itemdeservicos');
    expect(CRM_OBJECTS.workspaceMember.queryName).toBe('workspaceMembers');
  });

  it('deve ter todos os campos custom mapeados', () => {
    expect(CRM_FIELDS.opportunity.serviceType).toBe('tipoDeServico');
    expect(CRM_FIELDS.opportunity.serviceAddress).toBe('moradaDeServico');
    expect(CRM_FIELDS.task.technicianName).toBe('technicianName');
    expect(CRM_FIELDS.task.repairAddress).toBe('moradaDaReparacao');
    expect(CRM_FIELDS.serviceItem.prepared).toBe('preparado');
    expect(CRM_FIELDS.serviceItem.warehouseState).toBe('estadoDoArmazem');
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

  describe('isMeasurementService & isInstallationService', () => {
    it('deve identificar serviços de medição por estágio, tipo ou título', () => {
      expect(isMeasurementService('TIRAR_MEDIDAS')).toBe(true);
      expect(isMeasurementService(null, ['TIRAR_MEDIDAS'])).toBe(true);
      expect(isMeasurementService(null, null, 'Medição de Estores')).toBe(true);
      expect(isMeasurementService('ENTRADA', null, null)).toBe(true);
      expect(isMeasurementService(null, ['REMEDICAO'], null)).toBe(true);
      expect(isMeasurementService('INSTALACAO')).toBe(false);
    });

    it('deve identificar serviços de instalação por estágio, tipo ou título', () => {
      expect(isInstallationService('INSTALACAO')).toBe(true);
      expect(isInstallationService('MARCAR_INSTALACAO')).toBe(true);
      expect(isInstallationService('AGENDAR_INSTALACAO')).toBe(true);
      expect(isInstallationService(null, ['INSTALACAO'])).toBe(true);
      expect(isInstallationService(null, null, 'Montagem de Estores')).toBe(true);
      expect(isInstallationService('TIRAR_MEDIDAS')).toBe(false);
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
      expect(getNextStageOnSchedule('ORCAMENTAR', ['REMEDICAO'])).toBe('ORCAMENTAR');
    });

    it('deve manter estágios que não requerem transição automática', () => {
      expect(getNextStageOnSchedule('INSTALACAO')).toBe('INSTALACAO');
    });
  });
});
