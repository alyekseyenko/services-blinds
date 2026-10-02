import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildCancellationUrl,
  buildEvaluationUrl,
  signPublicToken,
  verifyPublicToken,
} from "../publicTokens";

const TEST_SECRET = "test-public-link-secret-32chars";

describe("publicTokens", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = TEST_SECRET;
    delete process.env.PUBLIC_LINK_SECRET;
    delete process.env.PUBLIC_LINK_TTL_DAYS;
  });

  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.PUBLIC_LINK_SECRET;
  });

  it("assina e valida token de avaliação", () => {
    const opportunityId = "550e8400-e29b-41d4-a716-446655440000";
    const token = signPublicToken({ purpose: "evaluation", opportunityId });
    const payload = verifyPublicToken(token, { purpose: "evaluation", opportunityId });
    expect(payload?.purpose).toBe("evaluation");
    expect(payload?.opportunityId).toBe(opportunityId);
  });

  it("rejeita token com purpose errado", () => {
    const taskId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    const token = signPublicToken({ purpose: "cancellation", taskId });
    expect(
      verifyPublicToken(token, { purpose: "evaluation", opportunityId: "550e8400-e29b-41d4-a716-446655440000" })
    ).toBeNull();
  });

  it("rejeita token expirado", () => {
    const opportunityId = "550e8400-e29b-41d4-a716-446655440000";
    const token = signPublicToken({
      purpose: "evaluation",
      opportunityId,
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(verifyPublicToken(token, { purpose: "evaluation", opportunityId })).toBeNull();
  });

  it("gera URLs com query token", () => {
    const baseUrl = "https://technicians.example.com";
    const evaluationUrl = buildEvaluationUrl("550e8400-e29b-41d4-a716-446655440000", baseUrl);
    const cancellationUrl = buildCancellationUrl("6ba7b810-9dad-11d1-80b4-00c04fd430c8", baseUrl);

    expect(evaluationUrl).toContain("/avaliacao/550e8400-e29b-41d4-a716-446655440000?t=");
    expect(cancellationUrl).toContain("/cancelamento/6ba7b810-9dad-11d1-80b4-00c04fd430c8?t=");
  });
});
