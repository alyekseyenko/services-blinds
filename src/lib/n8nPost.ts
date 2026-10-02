import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export const N8N_FETCH_TIMEOUT_MS = 10_000;

export function getN8nWebhookSecret(): string | undefined {
  const value = process.env.N8N_WEBHOOK_SECRET?.trim();
  return value || undefined;
}

export function verifyIncomingN8nWebhookSecret(
  headerValue: string | null | undefined
): boolean {
  const expected = getN8nWebhookSecret();
  if (!expected || !headerValue) return false;
  const received = Buffer.from(headerValue.trim());
  const expectedBuf = Buffer.from(expected);
  if (received.length !== expectedBuf.length) return false;
  return timingSafeEqual(received, expectedBuf);
}

export function buildN8nWebhookHeaders(
  body: string,
  idempotencyKey?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const secret = getN8nWebhookSecret();
  if (!secret) {
    return headers;
  }

  const timestamp = new Date().toISOString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  headers["X-Webhook-Secret"] = secret;
  headers["X-Webhook-Timestamp"] = timestamp;
  headers["X-Webhook-Signature"] = signature;

  return headers;
}

export async function postToN8n(
  url: string,
  body: Record<string, unknown>,
  options?: { idempotencyKey?: string; timeoutMs?: number }
): Promise<Response> {
  const bodyStr = JSON.stringify(body);
  const headers = buildN8nWebhookHeaders(bodyStr, options?.idempotencyKey);

  return fetch(url, {
    method: "POST",
    headers,
    body: bodyStr,
    signal: AbortSignal.timeout(options?.timeoutMs ?? N8N_FETCH_TIMEOUT_MS),
  });
}
