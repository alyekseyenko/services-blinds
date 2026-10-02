import type { VisitService } from "@/lib/schemas";
import { ONBOARDING_DEMO_OPP_ID } from "@/lib/onboarding/demoMapPin";

export function createDemoExtraMaintenanceService(): VisitService {
  return {
    opportunityId: `${ONBOARDING_DEMO_OPP_ID}-extra-manutencao`,
    name: "Manutenção — exemplo extra",
    nsi: "NSI-GUIA-001",
    stage: "Entrada",
    serviceType: "MANUTENCAO",
    mode: "now",
    isPrimary: false,
    createdOnSite: true,
  };
}
