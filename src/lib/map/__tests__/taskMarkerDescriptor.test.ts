import { describe, expect, it } from "vitest";
import {
  buildTaskMarkerDescriptor,
  getTechnicianColor,
  UNASSIGNED_TECHNICIAN_COLOR,
} from "@/lib/map/taskMarkerDescriptor";

describe("taskMarkerDescriptor", () => {
  it("getTechnicianColor é estável para o mesmo nome", () => {
    const a = getTechnicianColor("João");
    const b = getTechnicianColor("João");
    expect(a).toBe(b);
  });

  it("bolinha verde quando não há técnico atribuído", () => {
    expect(getTechnicianColor(null)).toBe(UNASSIGNED_TECHNICIAN_COLOR);
    expect(getTechnicianColor("Não atribuído")).toBe(UNASSIGNED_TECHNICIAN_COLOR);
    expect(getTechnicianColor("Unscheduled")).toBe(UNASSIGNED_TECHNICIAN_COLOR);
    expect(UNASSIGNED_TECHNICIAN_COLOR.toLowerCase()).toBe("#10b981");
  });

  it("marca como unscheduled quando em Entrada sem agendamento", () => {
    const d = buildTaskMarkerDescriptor(
      {
        id: "t1",
        title: "Visita",
        stage: "Entrada",
        hasScheduledTask: false,
      },
      { highlightedIds: [], selectedMarker: null, showTechnicianColors: false }
    );
    expect(d.isUnscheduled).toBe(true);
  });

  it("histórico cancelado usa emblema cancelled", () => {
    const d = buildTaskMarkerDescriptor(
      {
        id: "c1",
        title: "Toldo",
        hasScheduledTask: true,
        taskStatus: "CANCELADO",
      },
      { highlightedIds: [], selectedMarker: null, showTechnicianColors: true }
    );
    expect(d.statusBadge).toBe("cancelled");
  });

  it("destaque quando id está em highlightedIds", () => {
    const d = buildTaskMarkerDescriptor(
      { id: "abc", title: "X", stage: "AGENDADO", hasScheduledTask: true },
      { highlightedIds: ["abc"], selectedMarker: null, showTechnicianColors: false }
    );
    expect(d.isHighlighted).toBe(true);
  });
});