import { defineE2ECheck } from "../checkHelpers";
import { isMeasurementsDbConfigured, pingMeasurementsDb } from "@/lib/measurements/db/client";

export const measurementsDbCheck = defineE2ECheck({
  id: "measurements-db-ping",
  name: "Postgres de medições",
  category: "INFRA",
  description: "Base de dados dedicada às fichas de medição (MEASUREMENTS_DATABASE_URL)",
  tier: "safe",
  covers: ["system:measurements-db"],
  remediation:
    "Confirme o serviço measurements-db no Docker e MEASUREMENTS_DATABASE_URL na app.",
  async run() {
    if (!isMeasurementsDbConfigured()) {
      return {
        status: "WARN",
        message: "MEASUREMENTS_DATABASE_URL não definido (ambiente local sem Postgres de medições).",
      };
    }
    const ok = await pingMeasurementsDb();
    if (!ok) {
      return {
        status: "FAIL",
        message: "Não foi possível contactar a base de dados de medições.",
      };
    }
    return { status: "PASS", message: "Postgres de medições acessível." };
  },
});
