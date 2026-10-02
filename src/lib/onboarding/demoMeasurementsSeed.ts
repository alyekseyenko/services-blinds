import { ONBOARDING_DEMO_OPP_ID, ONBOARDING_DEMO_TASK_ID } from "@/lib/onboarding/demoMapPin";
import { getMeasurementsDraftKey } from "@/lib/measurementsUtils";

/** Rascunho de exemplo para o passo de medições do guia (só localStorage). */
export const ONBOARDING_SEED_MEASUREMENTS_EVENT = "app:onboarding-seed-measurements";

export function seedOnboardingDemoMeasurementsDraft(): void {
  if (typeof window === "undefined") return;
  const key = getMeasurementsDraftKey(ONBOARDING_DEMO_TASK_ID, ONBOARDING_DEMO_OPP_ID);
  const payload = {
    groups: [
      {
        id: 9001,
        type: "ESTORE_EXTERIOR",
        details: {
          material: "ALUMINIO_TERMICO",
          otherMaterial: "",
          ral: "9010",
          activation: "MANUAL",
          model: "Exemplo guia",
          fabric: "",
          reference: "",
          observations: "Medição fictícia para formação",
        },
        measurements: [
          {
            qty: 1,
            width: "1200",
            height: "1500",
            fixation: "Tecto",
            controls: "Direita",
            notes: "Sala de estar (exemplo)",
            price: "",
          },
        ],
        isOpen: true,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(key, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(ONBOARDING_SEED_MEASUREMENTS_EVENT));
}
