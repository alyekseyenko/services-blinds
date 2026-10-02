import type { OnboardingTourId } from "@/lib/schemas/onboarding";
import { HQ_LAT, HQ_LNG } from "@/lib/hq";

export const ONBOARDING_DEMO_TASK_ID = "onboarding-demo-map-pin";
export const ONBOARDING_DEMO_OPP_ID = "onboarding-demo-opportunity";

/** Client-only demo entity — never synced to CRM. */

/** Slightly offset from HQ so the pin is visible on first load. */
export function getOnboardingDemoCoordinates(): [number, number] {
  return [HQ_LAT + 0.008, HQ_LNG + 0.012];
}

function demoScheduledAtToday(): Date {
  const d = new Date();
  d.setHours(10, 30, 0, 0);
  return d;
}

export function createTechnicianOnboardingDemoTask() {
  const when = demoScheduledAtToday();
  return normalizeTechnicianDemoTask({
    id: ONBOARDING_DEMO_TASK_ID,
    twentyId: ONBOARDING_DEMO_TASK_ID,
    opportunityId: ONBOARDING_DEMO_OPP_ID,
    title: "Tirar medidas — exemplo do guia",
    client: "Cliente exemplo (guia)",
    company: "Cliente exemplo (guia)",
    address: "Rua de Demonstração, 1 — Lisboa (só para formação)",
    nsi: "NSI-GUIA-001",
    coordinates: getOnboardingDemoCoordinates(),
    serviceType: "TIRAR_MEDIDAS",
    status: "AGENDADO",
    taskStatus: "AGENDADO",
    stage: "Tirar Medidas",
    hasScheduledTask: true,
    scheduledAt: when,
    dueDate: when,
    report: "",
    isOnboardingDemo: true as const,
  });
}

/** Garante `dueDate` como Date para o dashboard e o drawer. */
export function normalizeTechnicianDemoTask<T extends { dueDate: Date | string }>(task: T): T & { dueDate: Date } {
  const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  return { ...task, dueDate };
}

export function createAdminOnboardingDemoOpportunity() {
  return {
    id: ONBOARDING_DEMO_TASK_ID,
    twentyId: ONBOARDING_DEMO_TASK_ID,
    title: "Instalação — exemplo do guia",
    client: "Cliente exemplo (guia)",
    address: "Rua de Demonstração, 1 — Lisboa (só para formação)",
    nsi: "NSI-GUIA-001",
    coordinates: getOnboardingDemoCoordinates(),
    serviceType: "INSTALACAO",
    status: "PENDENTE",
    taskStatus: "PENDENTE",
    stage: "AGENDAR_INSTALACAO",
    hasScheduledTask: false,
    scheduledAt: null,
    dueDate: null,
    taskId: "",
    technician: "",
    report:
      "Nota comercial (exemplo): cliente disponível manhãs. Confirmar medidas no local.",
    rawAddress: {
      addressStreet1: "Rua de Demonstração, 1",
      addressStreet2: "",
      addressCity: "Lisboa",
      addressState: "Lisboa",
      addressPostcode: "1000-001",
      addressCountry: "Portugal",
    },
    isOnboardingDemo: true as const,
  };
}

export function createAdminOnboardingDemoOpportunityScheduled() {
  const when = demoScheduledAtToday();
  const base = createAdminOnboardingDemoOpportunity();
  return {
    ...base,
    hasScheduledTask: true,
    taskId: "onboarding-demo-task-scheduled",
    scheduledAt: when,
    dueDate: when,
    technician: "João — exemplo do guia",
    stage: "AGENDADO",
    taskStatus: "AGENDADO",
    status: "AGENDADO",
    technicianReport: "Exemplo do guia: trabalho concluído sem incidentes.",
  };
}

export function createAdminOnboardingDemoOpportunityInProgress() {
  const base = createAdminOnboardingDemoOpportunityScheduled();
  return {
    ...base,
    taskStatus: "EM_CURSO",
    status: "EM_CURSO",
  };
}

export function createAdminOnboardingDemoOpportunityCompleted() {
  const when = demoScheduledAtToday();
  const base = createAdminOnboardingDemoOpportunity();
  return {
    ...base,
    hasScheduledTask: true,
    taskId: "onboarding-demo-task-completed",
    scheduledAt: when,
    dueDate: when,
    technician: "João — exemplo do guia",
    stage: "CONCLUIDO",
    taskStatus: "CONCLUIDO",
    status: "CONCLUIDO",
    technicianReport: "Exemplo do guia: trabalho concluído sem incidentes.",
  };
}

export function createOnboardingDemoEntity(tourId: OnboardingTourId) {
  if (tourId === "technician") return createTechnicianOnboardingDemoTask();
  if (tourId === "admin") return createAdminOnboardingDemoOpportunity();
  return null;
}

const ONBOARDING_DEMO_ID_PREFIX = "onboarding-demo";

/** Any CRM-sync guard should treat these IDs as demo-only. */
export function isOnboardingDemoId(id: string | null | undefined): boolean {
  if (!id) return false;
  if (id === ONBOARDING_DEMO_TASK_ID || id === ONBOARDING_DEMO_OPP_ID) return true;
  return id.startsWith(`${ONBOARDING_DEMO_ID_PREFIX}-`) || id.startsWith(ONBOARDING_DEMO_ID_PREFIX);
}

export function isOnboardingDemoEntity(
  entity: { id?: string; opportunityId?: string } | null | undefined
): boolean {
  if (!entity) return false;
  return isOnboardingDemoId(entity.id) || isOnboardingDemoId(entity.opportunityId);
}

export function taskListHasMapPin<T extends { coordinates?: unknown }>(tasks: T[]): boolean {
  return tasks.some(
    (t) =>
      Array.isArray(t.coordinates) &&
      t.coordinates.length === 2 &&
      Number.isFinite(t.coordinates[0]) &&
      Number.isFinite(t.coordinates[1])
  );
}
