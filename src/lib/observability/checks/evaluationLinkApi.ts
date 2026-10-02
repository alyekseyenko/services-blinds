import { getN8nWebhookSecret } from "@/lib/n8nPost";
import { defineE2ECheck } from "../checkHelpers";

export const evaluationLinkApiCheck = defineE2ECheck({
  id: "evaluation-link-api",
  name: "Evaluation Link API (n8n)",
  category: "PORTALS",
  description:
    "n8n can mint HMAC evaluation URLs via /api/public-links/evaluation",
  tier: "safe",
  covers: ["system:public-portals", "api:/api/public-links/evaluation"],
  remediation:
    "Set N8N_WEBHOOK_SECRET on the app and n8n; ensure NEXT_PUBLIC_APP_URL is correct.",
  async run() {
    const secret = getN8nWebhookSecret();
    if (!secret) {
      return {
        status: "WARN",
        message: "N8N_WEBHOOK_SECRET não definido — API de links indisponível para n8n.",
      };
    }

    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://127.0.0.1:3000";
    const url = new URL("/api/public-links/evaluation", base).toString();

    const unauth = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunityId: "00000000-0000-4000-8000-000000000001",
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (unauth.status !== 401) {
      return {
        status: "FAIL",
        message: `Esperado HTTP 401 sem segredo; recebido ${unauth.status}.`,
        details: { url },
      };
    }

    return {
      status: "PASS",
      message: "API de evaluation link rejeita pedidos não autenticados.",
      details: { url },
    };
  },
});
