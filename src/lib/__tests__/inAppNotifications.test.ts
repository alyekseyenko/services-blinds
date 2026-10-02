import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getNotificationScope,
  loadInAppNotifications,
  migrateLegacyInAppNotificationScope,
  partitionInAppNotifications,
  pushOrMergeAgendaInAppNotification,
  saveInAppNotifications,
} from "../inAppNotifications";

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("getNotificationScope", () => {
  it("uses consistent admin and technician scopes", () => {
    expect(getNotificationScope("admin", "abc")).toBe("admin_abc");
    expect(getNotificationScope("admin")).toBe("admin_member");
    expect(getNotificationScope("technician", "xyz")).toBe("tech_xyz");
    expect(getNotificationScope("technician")).toBe("technician");
  });
});

describe("loadInAppNotifications", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("window", globalThis);
  });

  it("drops corrupted notification entries", () => {
    const scope = "tech_test";
    localStorage.setItem(
      `fieldops_inapp_notifications_v1_${scope}`,
      JSON.stringify([
        {
          id: "1",
          title: "Ok",
          description: "desc",
          createdAt: Date.now(),
          read: false,
        },
        { id: "bad", title: 123 },
      ])
    );
    const items = loadInAppNotifications(scope);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Ok");
  });

  it("persists valid notifications", () => {
    const scope = "admin_test";
    saveInAppNotifications(scope, [
      {
        id: "n1",
        title: "T",
        description: "D",
        createdAt: 1,
        read: false,
      },
    ]);
    expect(loadInAppNotifications(scope)).toHaveLength(1);
  });

  it("migrates legacy admin_member scope into user scope", () => {
    saveInAppNotifications("admin_member", [
      {
        id: "legacy-1",
        title: "Legado",
        description: "D",
        createdAt: 100,
        read: false,
      },
    ]);
    migrateLegacyInAppNotificationScope("admin_user-1");
    expect(loadInAppNotifications("admin_user-1")).toHaveLength(1);
    expect(loadInAppNotifications("admin_user-1")[0].title).toBe("Legado");
    expect(loadInAppNotifications("admin_member")).toHaveLength(0);
  });
});

describe("pushOrMergeAgendaInAppNotification", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("window", {
      ...globalThis,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("atualiza o aviso não lido da mesma visita em vez de criar outro", () => {
    const scope = "admin_merge";
    pushOrMergeAgendaInAppNotification(scope, {
      title: "Visita em curso",
      description: "Cliente A",
      taskId: "task-1",
      agendaKind: "em_curso",
      agendaProgress: ["em_curso"],
      notificationKind: "agenda",
    });
    pushOrMergeAgendaInAppNotification(scope, {
      title: "Visita concluída",
      description: "Cliente A — concluída",
      taskId: "task-1",
      agendaKind: "concluida",
      agendaProgress: ["em_curso", "concluida"],
      notificationKind: "agenda",
    });
    const items = loadInAppNotifications(scope);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Visita concluída");
    expect(items[0].agendaProgress).toEqual(["em_curso", "concluida"]);
  });

  it("funde na mesma visita mesmo depois de lida", () => {
    const scope = "admin_merge_read";
    pushOrMergeAgendaInAppNotification(scope, {
      title: "Visita em curso",
      description: "Cliente A",
      taskId: "task-2",
      agendaKind: "em_curso",
      agendaTimeline: [{ kind: "em_curso", at: Date.now() }],
      notificationKind: "agenda",
    });
    const read = loadInAppNotifications(scope).map((n) => ({ ...n, read: true }));
    saveInAppNotifications(scope, read);
    pushOrMergeAgendaInAppNotification(scope, {
      title: "Visita concluída",
      description: "Cliente A",
      taskId: "task-2",
      agendaKind: "concluida",
      agendaTimeline: [
        { kind: "em_curso", at: Date.now() - 1000 },
        { kind: "concluida", at: Date.now() },
      ],
      notificationKind: "agenda",
    });
    const items = loadInAppNotifications(scope);
    expect(items).toHaveLength(1);
    expect(items[0].read).toBe(false);
    expect(items[0].agendaKind).toBe("concluida");
  });

  it("migra agendaProgress para agendaTimeline ao carregar", () => {
    const scope = "admin_migrate";
    localStorage.setItem(
      `fieldops_inapp_notifications_v1_${scope}`,
      JSON.stringify([
        {
          id: "1",
          title: "T",
          description: "D",
          createdAt: 5000,
          read: true,
          agendaProgress: ["em_curso", "concluida"],
        },
      ])
    );
    const items = loadInAppNotifications(scope);
    expect(items[0].agendaTimeline?.map((e) => e.kind)).toEqual(["em_curso", "concluida"]);
  });
});

describe("partitionInAppNotifications", () => {
  it("splits unread and read, newest first in each group", () => {
    const { unread, read } = partitionInAppNotifications([
      {
        id: "a",
        title: "A",
        description: "",
        createdAt: 100,
        read: true,
      },
      {
        id: "b",
        title: "B",
        description: "",
        createdAt: 300,
        read: false,
      },
      {
        id: "c",
        title: "C",
        description: "",
        createdAt: 200,
        read: false,
      },
    ]);
    expect(unread.map((n) => n.id)).toEqual(["b", "c"]);
    expect(read.map((n) => n.id)).toEqual(["a"]);
  });
});
