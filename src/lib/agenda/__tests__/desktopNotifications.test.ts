import { describe, expect, it } from "vitest";
import {
  buildAgendaNotificationDeepLink,
  parseAgendaNotificationDeepLink,
  roleFromNotificationScope,
  stripAgendaNotificationDeepLinkParams,
} from "@/lib/agenda/desktopNotifications";

describe("desktopNotifications", () => {
  it("resolve o papel a partir do scope", () => {
    expect(roleFromNotificationScope("admin_abc")).toBe("admin");
    expect(roleFromNotificationScope("tech_xyz")).toBe("technician");
    expect(roleFromNotificationScope("other")).toBeNull();
  });

  it("constrói e parseia deep link admin", () => {
    const path = buildAgendaNotificationDeepLink("admin", {
      taskId: "t1",
      opportunityId: "o1",
    });
    expect(path).toContain("/admin?");
    expect(path).toContain("bellTaskId=t1");
    const parsed = parseAgendaNotificationDeepLink(path.split("?")[1] ?? "");
    expect(parsed?.taskId).toBe("t1");
    expect(parsed?.opportunityId).toBe("o1");
  });

  it("remove parâmetros bell da query", () => {
    const next = stripAgendaNotificationDeepLinkParams(
      "bellTaskId=a&view=map&bellOpportunityId=b"
    );
    expect(next).toBe("view=map");
  });
});