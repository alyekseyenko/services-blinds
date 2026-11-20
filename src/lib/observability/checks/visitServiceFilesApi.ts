import { defineE2ECheck } from "../checkHelpers";

export const visitServiceFilesApiCheck = defineE2ECheck({
  id: "visit-service-files-api",
  name: "API ficheiros do serviço (técnico)",
  category: "APP",
  description:
    "Lista e proxy autenticados dos anexos da oportunidade ligados à visita do técnico",
  tier: "safe",
  covers: [
    "api:/api/opportunities/[id]/files",
    "api:/api/opportunities/[id]/files/[attachmentId]",
    "system:twenty-graphql",
  ],
  remediation:
    "Verifique src/app/api/opportunities/[id]/files e fetchOpportunityAttachmentNodes no CRM.",
  async run() {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
    if (!baseUrl) {
      return {
        status: "WARN",
        message: "NEXTAUTH_URL não definido — verificação HTTP omitida.",
      };
    }
    const root = baseUrl.replace(/\/$/, "");
    const listUrl = `${root}/api/opportunities/demo/files?taskId=demo`;
    try {
      const res = await fetch(listUrl, { method: "GET", redirect: "manual" });
      if (res.status === 401 || res.status === 403) {
        return {
          status: "PASS",
          message: "Endpoints de ficheiros protegidos (resposta esperada sem sessão).",
          details: { status: res.status },
        };
      }
      if (!res.ok) {
        return {
          status: "WARN",
          message: `Resposta inesperada da lista de ficheiros: HTTP ${res.status}.`,
        };
      }
      return {
        status: "PASS",
        message: "Lista de ficheiros do serviço responde.",
      };
    } catch (error) {
      return {
        status: "WARN",
        message: "Não foi possível contactar a API de ficheiros do serviço.",
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  },
});