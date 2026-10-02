import type { ScheduleForm } from "@/components/admin/ScheduleModal";
import type { Opportunity, WorkspaceMember } from "@/types/admin";

/** Preenche o modal de agendamento no guia (valores editáveis, não vão ao CRM). */
export function buildAdminDemoScheduleFormSeed(
  opp: Opportunity,
  members: WorkspaceMember[]
): ScheduleForm {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = tomorrow.toISOString().split("T")[0];
  const tech = members.find((m) => m.isWorkspaceMember) ?? members[0];

  return {
    title: `Visita Técnica - ${opp.title}`,
    date,
    time: "10:30",
    technicianId: tech?.id ?? "",
    urgent: false,
    notes:
      "Formação: portão azul à direita. Estacionar na rua lateral. Cliente prefere contacto 30 min antes.",
    addressStreet1: opp.rawAddress?.addressStreet1 || "Rua de Demonstração, 1",
    addressStreet2: opp.rawAddress?.addressStreet2 || "",
    addressCity: opp.rawAddress?.addressCity || "Lisboa",
    addressState: opp.rawAddress?.addressState || "",
    addressPostcode: opp.rawAddress?.addressPostcode || "1000-001",
    addressCountry: opp.rawAddress?.addressCountry || "Portugal",
    addressLat: opp.coordinates ? opp.coordinates[0] : null,
    addressLng: opp.coordinates ? opp.coordinates[1] : null,
  };
}
