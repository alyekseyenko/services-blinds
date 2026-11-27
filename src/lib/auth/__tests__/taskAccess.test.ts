import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session.server", () => ({
  getAppSession: vi.fn(),
}));

vi.mock("@/lib/crm/tasks/read", () => ({
  getTaskTeamAccess: vi.fn(),
}));

import { getAppSession } from "@/lib/auth/session.server";
import { getTaskTeamAccess } from "@/lib/crm/tasks/read";
import {
  assertCanContributeToTask,
  assertCanControlVisitLifecycle,
} from "@/lib/auth/taskAccess";

describe("taskAccess team roles", () => {
  beforeEach(() => {
    vi.mocked(getAppSession).mockResolvedValue({
      user: { id: "tech-a", role: "technician", name: "Auxiliar" },
    } as Awaited<ReturnType<typeof getAppSession>>);
    vi.mocked(getTaskTeamAccess).mockResolvedValue({
      masterId: "tech-m",
      assistantIds: ["tech-a"],
    });
  });

  it("allows assistant to contribute", async () => {
    const access = await assertCanContributeToTask("task-1");
    expect(access.ok).toBe(true);
    if (access.ok) expect(access.visitRole).toBe("assistant");
  });

  it("blocks assistant from lifecycle control", async () => {
    const access = await assertCanControlVisitLifecycle("task-1");
    expect(access.ok).toBe(false);
    if (!access.ok) {
      expect(access.error).toContain("Master");
      expect(access.errorCode).toBe("business");
    }
  });
});