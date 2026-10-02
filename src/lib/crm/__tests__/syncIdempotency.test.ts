import { describe, expect, it } from "vitest";
import {
  appendSyncDoneMarker,
  hasSyncDoneMarker,
  hasMeasurementSyncMarker,
  prependMeasurementSyncMarker,
  stripNoteBodyForDisplay,
} from "@/lib/crm/syncIdempotency";

describe("syncIdempotency", () => {
  it("evita duplicar marcadores SYNC_DONE no corpo da tarefa", () => {
    const id = "req-123";
    const once = appendSyncDoneMarker("Relatório", id);
    const twice = appendSyncDoneMarker(once, id);
    expect(hasSyncDoneMarker(twice, id)).toBe(true);
    expect(twice.match(/\[SYNC_DONE\]req-123/g)?.length).toBe(1);
  });

  it("evita duplicar marcadores de medição", () => {
    const id = "meas-1";
    const notes = prependMeasurementSyncMarker("### Medidas", id);
    expect(hasMeasurementSyncMarker(notes, id)).toBe(true);
    const again = prependMeasurementSyncMarker(notes, id);
    expect(again).toBe(notes);
  });

  it("remove marcadores NOTE_SYNC do texto mostrado ao utilizador", () => {
    const raw =
      "<!-- [NOTE_SYNC]a5f13797-left-ec2836c3 -->\nInstruções para o técnico.";
    expect(stripNoteBodyForDisplay(raw)).toBe("Instruções para o técnico.");
  });
});
