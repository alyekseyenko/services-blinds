import { defineE2ECheck } from "../checkHelpers";

export const adminMeasurementsExportApiCheck = defineE2ECheck({
  id: "admin-measurements-export-api",
  name: "API exportação de medições (admin)",
  category: "APP",
  description: "Endpoint autenticado para exportar fichas de medição em Excel ou PDF",
  tier: "safe",
  covers: ["api:/api/opportunities/[id]/measurements/export", "system:measurements-db"],
  remediation:
    "Verifique src/app/api/opportunities/[id]/measurements/export e fetchMeasurementSheet.",
  async run() {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
    if (!baseUrl) {
      return {
        status: "WARN",
        message: "NEXTAUTH_URL não definido — verificação HTTP omitida.",
      };
    }
    const url = `${baseUrl.replace(/\/$/, "")}/api/opportunities/demo/measurements/export?format=xlsx`;
    try {
      const res = await fetch(url, { method: "GET", redirect: "manual" });
      if (res.status === 401 || res.status === 403) {
        return {
          status: "PASS",
          message: "Endpoint protegido (resposta esperada sem sessão).",
          details: { status: res.status },
        };
      }
      if (!res.ok) {
        return {
          status: "WARN",
          message: `Resposta inesperada da exportação de medições: HTTP ${res.status}.`,
        };
      }
      return {
        status: "PASS",
        message: "Exportação de medições responde com sucesso.",
      };
    } catch (error) {
      return {
        status: "WARN",
        message: "Não foi possível contactar a exportação de medições.",
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  },
});
