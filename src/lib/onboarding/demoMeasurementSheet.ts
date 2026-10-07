import { ONBOARDING_DEMO_OPP_ID } from "@/lib/onboarding/demoMapPin";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";

export function createOnboardingDemoMeasurementSheet(): MeasurementSheet {
  const when = new Date();
  when.setHours(10, 30, 0, 0);
  return {
    sheetId: "00000000-0000-4000-8000-00000000d3m0",
    version: 1,
    opportunityId: ONBOARDING_DEMO_OPP_ID,
    clientName: "Cliente exemplo (guia)",
    nsi: "NSI-GUIA-001",
    address: "Rua de Demonstração, 1 — Lisboa (só para formação)",
    serviceLabel: "Tirar medidas",
    technicianName: "João — exemplo do guia",
    visitDateIso: when.toISOString(),
    groups: [
      {
        productType: "ESTORE_EXTERIOR",
        productLabel: "Estore Exterior",
        materialLabel: "Alumínio térmico",
        colorLabel: "9010",
        activationLabel: "Manual",
        observations: "Medição fictícia para formação",
        rows: [
          {
            index: 1,
            division: "Sala de estar (exemplo)",
            qty: 1,
            widthMm: 1200,
            heightMm: 1500,
            fixation: "Tecto",
            controls: "Direita",
            notes: "Sala de estar (exemplo)",
          },
        ],
      },
    ],
  };
}
