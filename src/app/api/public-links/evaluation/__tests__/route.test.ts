import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

describe("POST /api/public-links/evaluation", () => {
  const originalSecret = process.env.N8N_WEBHOOK_SECRET;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalNextAuth = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.N8N_WEBHOOK_SECRET = "test-webhook-secret-min-16";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.test";
    process.env.NEXTAUTH_SECRET = "test-nextauth-secret-min-16-chars";
  });

  afterEach(() => {
    process.env.N8N_WEBHOOK_SECRET = originalSecret;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    process.env.NEXTAUTH_SECRET = originalNextAuth;
    vi.restoreAllMocks();
  });

  it("rejeita pedidos sem segredo", async () => {
    const request = new NextRequest(
      "http://localhost/api/public-links/evaluation",
      {
        method: "POST",
        body: JSON.stringify({
          opportunityId: "00000000-0000-4000-8000-000000000099",
        }),
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("rejeita segredo incorreto", async () => {
    const request = new NextRequest(
      "http://localhost/api/public-links/evaluation",
      {
        method: "POST",
        headers: { "X-Webhook-Secret": "wrong-secret-value-here" },
        body: JSON.stringify({
          opportunityId: "00000000-0000-4000-8000-000000000099",
        }),
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("rejeita opportunityId inválido", async () => {
    const request = new NextRequest(
      "http://localhost/api/public-links/evaluation",
      {
        method: "POST",
        headers: {
          "X-Webhook-Secret": "test-webhook-secret-min-16",
        },
        body: JSON.stringify({ opportunityId: "not-a-uuid" }),
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("devolve evaluationUrl com segredo válido", async () => {
    const opportunityId = "00000000-0000-4000-8000-000000000099";
    const request = new NextRequest(
      "http://localhost/api/public-links/evaluation",
      {
        method: "POST",
        headers: {
          "X-Webhook-Secret": "test-webhook-secret-min-16",
        },
        body: JSON.stringify({ opportunityId }),
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = (await response.json()) as { evaluationUrl: string };
    expect(json.evaluationUrl).toContain(
      `https://app.example.test/avaliacao/${opportunityId}`
    );
    expect(json.evaluationUrl).toContain("?t=");
  });
});
