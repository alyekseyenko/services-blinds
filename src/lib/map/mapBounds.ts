export interface MapLatLng {
  lat: number;
  lng: number;
}

export function taskCoordinatesToLatLng(
  coordinates: [number, number] | null | undefined
): MapLatLng | null {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [lat, lng] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function collectPositionsFromTasks(
  tasks: Array<{ coordinates?: [number, number] | null }>
): MapLatLng[] {
  const out: MapLatLng[] = [];
  for (const task of tasks) {
    const pos = taskCoordinatesToLatLng(task.coordinates);
    if (pos) out.push(pos);
  }
  return out;
}

/** Suggested zoom when only one point should be framed. */
export function singlePointZoom(): number {
  return 15;
}

export function appendHqAndUser(
  points: MapLatLng[],
  hq?: MapLatLng | null,
  user?: MapLatLng | null
): MapLatLng[] {
  const next = [...points];
  if (hq) next.push(hq);
  if (user) next.push(user);
  return next;
}
