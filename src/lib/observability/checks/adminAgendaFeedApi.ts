import { defineE2ECheck } from "../checkHelpers";

export const adminAgendaFeedApiCheck = defineE2ECheck({
  id: "admin-agenda-feed-api",
  name: "API feed da agenda (admin)",
  category: "APP",
  description: "Endpoint autenticado que alimenta o sininho operacional do admin",
  tier: "safe",
  covers: ["api:/api/agenda/feed", "system:twenty-graphql"],
  remediation: "Verifique src/app/api/agenda/feed e fetchAdminAgendaFeed no CRM.",
  async run() {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
    if (!baseUrl) {
      return {
        status: "WARN",
        message: "NEXTAUTH_URL não definido — verificação HTTP omitida.",
      };
    }
    const url = `${baseUrl.replace(/\/$/, "")}/api/agenda/feed`;
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
          message: `Resposta inesperada do feed da agenda: HTTP ${res.status}.`,
        };
      }
      return {
        status: "PASS",
        message: "Feed da agenda responde com sucesso.",
      };
    } catch (error) {
      return {
        status: "WARN",
        message: "Não foi possível contactar o feed da agenda.",
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  },
});
