/** Stable SWR / IndexedDB key — do not add cosmetic query params (they remount sync). */
export function buildTechnicianTasksEndpoint(technicianId: string): string {
  return `/api/tasks?technicianId=${encodeURIComponent(technicianId)}`;
}
