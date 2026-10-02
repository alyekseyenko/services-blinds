import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  filterOutLocalChanges,
  markLocalAgendaChange,
} from "../agendaLocalChanges";

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

describe("agendaLocalChanges", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("window", globalThis);
    vi.useRealTimers();
  });

  it("filters events marked as local within TTL", () => {
    const scope = "tech_1";
    markLocalAgendaChange(scope, "task-1", ["em_curso"]);
    const events = filterOutLocalChanges(scope, [
      {
        kind: "em_curso",
        id: "task-1",
        label: "Visita",
      },
      {
        kind: "nova",
        id: "task-2",
        label: "Outra",
      },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("task-2");
  });

  it("allows events again after TTL expires", () => {
    vi.useFakeTimers();
    const scope = "tech_1";
    markLocalAgendaChange(scope, "task-1", ["em_curso"]);
    vi.advanceTimersByTime(11 * 60 * 1000);
    const events = filterOutLocalChanges(scope, [
      {
        kind: "em_curso",
        id: "task-1",
        label: "Visita",
      },
    ]);
    expect(events).toHaveLength(1);
  });

  it("only suppresses kinds listed in the ledger entry", () => {
    const scope = "tech_1";
    markLocalAgendaChange(scope, "task-1", ["em_curso"]);
    const events = filterOutLocalChanges(scope, [
      { kind: "em_curso", id: "task-1", label: "Visita" },
      { kind: "reagendada", id: "task-1", label: "Visita" },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("reagendada");
  });
});
