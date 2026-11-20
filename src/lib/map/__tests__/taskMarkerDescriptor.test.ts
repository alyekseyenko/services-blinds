import { describe, expect, it } from "vitest";
import { buildTaskMarkerDescriptor, getTechnicianColor } from "@/lib/map/taskMarkerDescriptor";

describe("taskMarkerDescriptor", () => {
  it("getTechnicianColor é estável para o mesmo nome", () => {
    const a = getTechnicianColor("João");
    const b = getTechnicianColor("João");
    expect(a).toBe(b);
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

  it("destaque quando id está em highlightedIds", () => {
    const d = buildTaskMarkerDescriptor(
      { id: "abc", title: "X", stage: "AGENDADO", hasScheduledTask: true },
      { highlightedIds: ["abc"], selectedMarker: null, showTechnicianColors: false }
    );
    expect(d.isHighlighted).toBe(true);
  });
});