import { createHmac, timingSafeEqual } from "crypto";
import {
  PublicTokenPayload,
  PublicTokenPayloadSchema,
} from "@/lib/schemas/publicPortal";

type PublicTokenPurpose = "evaluation" | "cancellation";

const DEFAULT_TTL_DAYS = 30;

function getPublicLinkSecret(): string {
  const secret = process.env.PUBLIC_LINK_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("PUBLIC_LINK_SECRET or NEXTAUTH_SECRET must be configured");
  }
  return secret;
}

function getTtlDays(): number {
  const raw = process.env.PUBLIC_LINK_TTL_DAYS;
  if (!raw) return DEFAULT_TTL_DAYS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? DEFAULT_TTL_DAYS : parsed;
}

function base64urlEncode(value: Buffer | string): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer.toString("base64url");
}

function base64urlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export function signPublicToken(
  payload: Omit<PublicTokenPayload, "exp"> & { exp?: number },
  ttlDays?: number
): string {
  const exp =
    payload.exp ??
    Math.floor(Date.now() / 1000) + (ttlDays ?? getTtlDays()) * 24 * 60 * 60;

  const body: PublicTokenPayload = { ...payload, exp };
  const json = JSON.stringify(body);
  const signature = createHmac("sha256", getPublicLinkSecret()).update(json).digest();
  return `${base64urlEncode(json)}.${base64urlEncode(signature)}`;
}

export function verifyPublicToken(
  token: string,
  expected: {
    purpose: PublicTokenPurpose;
    opportunityId?: string;
    taskId?: string;
  }
): PublicTokenPayload | null {
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  try {
    const json = base64urlDecode(payloadPart).toString("utf8");
    const expectedSignature = createHmac("sha256", getPublicLinkSecret())
      .update(json)
      .digest();
    const actualSignature = base64urlDecode(signaturePart);

    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      return null;
    }

    const parsed = PublicTokenPayloadSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;

    const payload = parsed.data;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.purpose !== expected.purpose) return null;

    if (expected.purpose === "evaluation") {
      if (!expected.opportunityId || payload.opportunityId !== expected.opportunityId) {
        return null;
      }
    }

    if (expected.purpose === "cancellation") {
      if (!expected.taskId || payload.taskId !== expected.taskId) {
        return null;
      }
    }

    return payload;
  } catch {
    return null;
  }
}

export function buildEvaluationUrl(opportunityId: string, baseUrl: string): string {
  const token = signPublicToken({ purpose: "evaluation", opportunityId });
  return `${baseUrl}/avaliacao/${opportunityId}?t=${encodeURIComponent(token)}`;
}

export function buildCancellationUrl(taskId: string, baseUrl: string): string {
  const token = signPublicToken({ purpose: "cancellation", taskId });
  return `${baseUrl}/cancelamento/${taskId}?t=${encodeURIComponent(token)}`;
}
