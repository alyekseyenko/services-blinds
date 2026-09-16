import { describe, it, expect } from "vitest";
import {
  isTaskActive,
  isTaskInProgress,
  isTaskCompleted,
  toTwentyTaskStatus,
} from "@/lib/crm/contract";
import { isTaskOverdue } from "@/lib/taskUtils";
import { hasValidMeasurements } from "@/lib/measurementsUtils";

/**
 * Regras de negócio críticas do fluxo técnico — regressões aqui bloqueiam conclusão em campo.
 */
describe("taskWorkflow", () => {
  const now = new Date("2026-09-16T14:00:00");

  describe("estados activos da visita", () => {
    it("Agendado e EM_CURSO mantêm visita na agenda", () => {
      expect(isTaskActive("AGENDADO")).toBe(true);
      expect(isTaskActive("Agendado")).toBe(true);
      expect(isTaskActive("EM_CURSO")).toBe(true);
      expect(isTaskActive("EM CURSO")).toBe(true);
      expect(isTaskCompleted("CONCLUIDO")).toBe(true);
      expect(isTaskActive("CONCLUIDO")).toBe(false);
    });

    it("EM_CURSO é visita em curso mas não concluída", () => {
      expect(isTaskInProgress("EM_CURSO")).toBe(true);
      expect(isTaskInProgress("AGENDADO")).toBe(false);
      expect(isTaskCompleted("EM_CURSO")).toBe(false);
    });

    it("envia EM_CURSO ao Twenty com underscore", () => {
      expect(toTwentyTaskStatus("EM CURSO")).toBe("EM_CURSO");
    });
  });

  describe("medições editáveis durante visita activa", () => {
    const editable = (status: string) => isTaskActive(status);

    it("técnico edita medições em Agendado e EM_CURSO", () => {
      expect(editable("AGENDADO")).toBe(true);
      expect(editable("EM_CURSO")).toBe(true);
    });

    it("medições bloqueadas após fecho da visita", () => {
      expect(editable("CONCLUIDO")).toBe(false);
      expect(editable("INCOMPLETO")).toBe(false);
      expect(editable("CANCELADO")).toBe(false);
    });
  });

  describe("gate de conclusão com medições", () => {
    const sample = {
      groups: [{ type: "ESTORE_EXTERIOR", measurements: [{ qty: 1, width: 1200, height: 1500 }] }],
    };

    it("bloqueia conclusão sem medições guardadas", () => {
      expect(hasValidMeasurements("", null)).toBe(false);
      expect(hasValidMeasurements("notas", null)).toBe(false);
    });

    it("permite conclusão com medições no rascunho ou relatório", () => {
      expect(hasValidMeasurements(formatDraft(sample), null)).toBe(true);
      expect(hasValidMeasurements("", JSON.stringify({ groups: sample.groups }))).toBe(true);
    });

    it("EM_CURSO deixa de contar como atrasada", () => {
      expect(isTaskOverdue("EM_CURSO", "2026-09-16T10:00:00", now)).toBe(false);
      expect(isTaskOverdue("AGENDADO", "2026-09-16T10:00:00", now)).toBe(true);
    });
  });
});

function formatDraft(sample: { groups: unknown[] }) {
  return `<!-- [JSON_MEASUREMENTS]${JSON.stringify(sample)} -->`;
}
