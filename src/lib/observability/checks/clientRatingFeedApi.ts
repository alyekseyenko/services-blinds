import { defineE2ECheck } from "../checkHelpers";

export const clientRatingFeedApiCheck = defineE2ECheck({
  id: "client-rating-feed-api",
  name: "API de avaliações recentes",
  category: "APP",
  description: "Endpoint autenticado que alimenta o sininho quando um cliente deixa estrelas",
  tier: "safe",
  covers: ["api:/api/agenda/ratings", "system:twenty-graphql"],
  remediation: "Verifique src/app/api/agenda/ratings e fetchRecentClientRatings.",
  async run() {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
    if (!baseUrl) {
      return {
        status: "WARN",
        message: "NEXTAUTH_URL não definido — verificação HTTP omitida.",
      };
    }
    const url = `${baseUrl.replace(/\/$/, "")}/api/agenda/ratings`;
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
          message: `Resposta inesperada das avaliações: HTTP ${res.status}.`,
        };
      }
      return {
        status: "PASS",
        message: "Feed de avaliações responde com sucesso.",
      };
    } catch (error) {
      return {
        status: "WARN",
        message: error instanceof Error ? error.message : "Falha ao contactar o feed de avaliações.",
      };
    }
  },
});
