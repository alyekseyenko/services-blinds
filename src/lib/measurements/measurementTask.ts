export type CrmTaskRef = Record<string, unknown>;

export function listOpportunityTasksFromTargets(
  taskTargets?: { edges?: Array<{ node?: { task?: CrmTaskRef } }> }
): CrmTaskRef[] {
  return (
    taskTargets?.edges
      ?.map((e) => e.node?.task)
      .filter((t): t is CrmTaskRef => Boolean(t)) ?? []
  );
}

/** Visita em curso se `taskId` for indicado; senão a primeira task da oportunidade. */
export function pickTaskForMeasurement(
  tasks: CrmTaskRef[],
  taskId?: string
): CrmTaskRef | null {
  if (taskId) {
    const match = tasks.find((task) => String(task.id || "") === taskId);
    if (match) return match;
  }
  return tasks[0] ?? null;
}

export function taskIdFromCrmTask(task: CrmTaskRef | null | undefined): string | null {
  const id = task?.id;
  if (id == null || String(id).trim() === "") return null;
  return String(id);
}