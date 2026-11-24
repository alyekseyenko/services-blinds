import { describe, expect, it, vi } from "vitest";
import { runNotificationActivateSteps } from "@/lib/agenda/notificationActivate";
import type { InAppNotification } from "@/lib/inAppNotifications";

function baseNotif(overrides: Partial<InAppNotification> = {}): InAppNotification {
  return {
    id: "n1",
    title: "Teste",
    description: "desc",
    createdAt: Date.now(),
    read: false,
    ...overrides,
  };
}

describe("runNotificationActivateSteps", () => {
  it("prioriza href para observabilidade", () => {
    const onNavigateHref = vi.fn();
    const onInvestigate = vi.fn();
    const n = baseNotif({
      href: "/admin/observabilidade",
      taskId: "t1",
      opportunityId: "o1",
    });
    runNotificationActivateSteps(n, { onNavigateHref, onInvestigate });
    expect(onNavigateHref).toHaveBeenCalledWith("/admin/observabilidade");
    expect(onInvestigate).not.toHaveBeenCalled();
  });

  it("admin: chama onInvestigate quando há taskId ou opportunityId", () => {
    const onInvestigate = vi.fn();
    const onOpenTaskOnMap = vi.fn();
    const n = baseNotif({ taskId: "task-99", opportunityId: "opp-1" });
    runNotificationActivateSteps(n, { onInvestigate, onOpenTaskOnMap });
    expect(onInvestigate).toHaveBeenCalledWith(n);
    expect(onOpenTaskOnMap).not.toHaveBeenCalled();
  });

  it("técnico: chama onOpenTaskOnMap quando não há onInvestigate", () => {
    const onOpenTaskOnMap = vi.fn();
    const n = baseNotif({ taskId: "task-42" });
    runNotificationActivateSteps(n, { onOpenTaskOnMap });
    expect(onOpenTaskOnMap).toHaveBeenCalledWith(n);
  });

  it("dispara evento abrir visita quando não há handlers dedicados", () => {
    const onDispatchOpenTask = vi.fn();
    const n = baseNotif({ taskId: "t1", dueAtIso: "2026-11-23T10:00:00.000Z" });
    runNotificationActivateSteps(n, { onDispatchOpenTask });
    expect(onDispatchOpenTask).toHaveBeenCalledWith({
      taskId: "t1",
      opportunityId: undefined,
      dueAtIso: "2026-11-23T10:00:00.000Z",
    });
  });
});