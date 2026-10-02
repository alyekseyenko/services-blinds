import { describe, expect, it } from "vitest";
import {
  appendHqAndUser,
  collectPositionsFromTasks,
  singlePointZoom,
  taskCoordinatesToLatLng,
} from "@/lib/map/mapBounds";

describe("mapBounds", () => {
  it("converte coordenadas de tarefas válidas", () => {
    expect(taskCoordinatesToLatLng([38.7, -9.1])).toEqual({ lat: 38.7, lng: -9.1 });
    expect(taskCoordinatesToLatLng(null)).toBeNull();
    expect(taskCoordinatesToLatLng([NaN, 1])).toBeNull();
  });

  it("recolhe posições ignorando entradas inválidas", () => {
    const points = collectPositionsFromTasks([
      { coordinates: [38.7, -9.1] },
      { coordinates: null },
      { coordinates: [38.8, -9.2] },
    ]);
    expect(points).toHaveLength(2);
  });

  it("usa zoom fixo para um único ponto", () => {
    expect(singlePointZoom()).toBe(15);
  });

  it("anexa sede e utilizador aos pontos de enquadramento", () => {
    const merged = appendHqAndUser(
      [{ lat: 1, lng: 2 }],
      { lat: 3, lng: 4 },
      { lat: 5, lng: 6 }
    );
    expect(merged).toHaveLength(3);
  });
});
