import { describe, it, expect } from 'vitest';
import { OpportunityStageEnum, TaskStatusEnum, MeasurementsPayloadSchema } from '../../schemas';

describe('Zod Domain Schemas', () => {
  it('should validate all valid opportunity stages', () => {
    const validStages = [
      "ENTRADA",
      "TIRAR_MEDIDAS",
      "ORCAMENTAR",
      "PROPOSTA",
      "PAGAMENTO_30",
      "ENCOMENDA",
      "PREPARACAO",
      "MARCAR_INSTALACAO",
      "INSTALACAO",
      "PAGAMENTO_TOTAL",
      "CONCLUIDO"
    ];

    validStages.forEach(stage => {
      expect(OpportunityStageEnum.safeParse(stage).success).toBe(true);
    });
  });

  it('should reject invalid opportunity stage', () => {
    expect(OpportunityStageEnum.safeParse("STAGE_INVENTED").success).toBe(false);
  });

  it('should validate task statuses', () => {
    const validStatuses = ["AGENDADO", "EM_CURSO", "CONCLUIDO", "INCOMPLETO", "CANCELADO"];
    validStatuses.forEach(status => {
      expect(TaskStatusEnum.safeParse(status).success).toBe(true);
    });
  });

  it('should validate complex MeasurementsPayload structure', () => {
    const validPayload = {
      groups: [
        {
          type: "ESTORE_COMPACTO",
          details: {
            material: "Alumínio Térmico",
            ral: "7016",
            activation: "Motor Somfy RTS"
          },
          measurements: [
            {
              qty: "2",
              width: "1450",
              height: "2100",
              notes: "Sala de Estar",
              fixation: "Teto"
            }
          ]
        }
      ]
    };

    const result = MeasurementsPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.groups[0].measurements[0].width).toBe(1450);
      expect(result.data.groups[0].measurements[0].qty).toBe(2);
    }
  });
});
