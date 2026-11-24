import { describe, expect, it } from "vitest";
import {
  buildAgendaNotificationHeadline,
  buildAgendaNotificationSubtitle,
} from "@/lib/agenda/notificationPayload";
import { buildAgendaSnapshotItem, formatAgendaDiffToast } from "@/lib/agenda/diff";

describe("buildAgendaNotificationHeadline", () => {
  it("usa o título da visita quando o cliente é genérico", () => {
    expect(
      buildAgendaNotificationHeadline({
        clientName: "Cliente",
        visitTitle: "Reparação Estore Elétrico Inês Mendes",
      })
    ).toBe("Reparação Estore Elétrico Inês Mendes");
  });

  it("mostra cliente e identificadores quando existem", () => {
    expect(
      buildAgendaNotificationHeadline({
        clientName: "Inês Mendes",
        serviceNumber: "181",
        nsi: "14313",
      })
    ).toBe("Inês Mendes · N.º 181 · NSI 14313");
  });

  it("subtítulo omite título já usado na headline", () => {
    expect(
      buildAgendaNotificationSubtitle({
        clientName: "Cliente",
        visitTitle: "Reparação Estore",
      })
    ).toBeUndefined();
    expect(
      buildAgendaNotificationSubtitle({
        clientName: "Inês Mendes",
        visitTitle: "Reparação Estore",
      })
    ).toBe("Reparação Estore");
  });
});

describe("rótulo de snapshot com cliente genérico", () => {
  it("coloca o título da visita no label do diff", () => {
    const item = buildAgendaSnapshotItem({
      id: "t1",
      dueAt: "2026-11-23T15:30:00.000Z",
      status: "AGENDADO",
      client: "Cliente",
      visitTitle: "Reparação Estore Elétrico",
    });
    expect(item.label).toContain("Reparação Estore Elétrico");
    const toast = formatAgendaDiffToast({
      kind: "nova",
      id: item.id,
      label: item.label,
      visitTitle: item.visitTitle,
      dueAt: item.dueAt,
      status: item.status,
    });
    expect(toast.description).toContain("Reparação Estore Elétrico");
  });
});