import { locationStore } from "@/lib/locationStore";
import { defineE2ECheck } from "../checkHelpers";

const PROBE_TECH_ID = "e2e-location-store-probe";

export const locationStoreRoundtripCheck = defineE2ECheck({
  id: "location-store-roundtrip",
  name: "Localização da frota",
  category: "APP",
  description: "Gravação e leitura híbrida do location store",
  tier: "safe",
  covers: ["system:location-store"],
  remediation: "Verifique APP_DATA_DIR e permissões de escrita.",
  async run() {
    const testLocation = {
      technicianId: PROBE_TECH_ID,
      technicianName: "Sonda E2E",
      lat: 38.7223,
      lng: -9.1393,
      lastUpdate: new Date().toISOString(),
      accuracy: 10,
    };

    await locationStore.save(testLocation);
    const active = await locationStore.getActive();
    const found = active.some((t) => t.technicianId === PROBE_TECH_ID);
    await locationStore.remove(PROBE_TECH_ID);

    if (!found) {
      return {
        status: "FAIL",
        message: "Sonda de localização não apareceu após gravação.",
      };
    }

    return {
      status: "PASS",
      message: `Location store OK (${active.length} técnico(s) ativos).`,
    };
  },
});
