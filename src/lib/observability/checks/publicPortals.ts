import {
  buildCancellationUrl,
  buildEvaluationUrl,
  signPublicToken,
  verifyPublicToken,
} from "@/lib/publicTokens";
import { defineE2ECheck } from "../checkHelpers";

const PROBE_TASK_ID = "00000000-0000-4000-8000-000000000001";
const PROBE_OPP_ID = "00000000-0000-4000-8000-000000000002";

export const publicCancelTokenCheck = defineE2ECheck({
  id: "public-cancel-token",
  name: "Cancellation Portal Tokens",
  category: "PORTALS",
  description: "HMAC cancellation tokens sign and verify correctly",
  tier: "safe",
  remediation:
    "Set PUBLIC_LINK_SECRET (or NEXTAUTH_SECRET) with at least 16 characters.",
  async run() {
    const token = signPublicToken({
      purpose: "cancellation",
      taskId: PROBE_TASK_ID,
    });
    const verified = verifyPublicToken(token, {
      purpose: "cancellation",
      taskId: PROBE_TASK_ID,
    });
    const url = buildCancellationUrl(PROBE_TASK_ID, "https://example.test");

    if (!verified?.taskId || !url.includes("/cancelamento/")) {
      return {
        status: "FAIL",
        message: "Cancellation token round-trip failed.",
      };
    }

    return {
      status: "PASS",
      message: "Cancellation portal HMAC tokens are valid.",
      details: { urlPrefix: url.split("?")[0] },
    };
  },
});

export const publicEvaluationTokenCheck = defineE2ECheck({
  id: "public-evaluation-token",
  name: "Evaluation Portal Tokens",
  category: "PORTALS",
  description: "HMAC evaluation tokens sign and verify correctly",
  tier: "safe",
  remediation:
    "Set PUBLIC_LINK_SECRET (or NEXTAUTH_SECRET) with at least 16 characters.",
  async run() {
    const token = signPublicToken({
      purpose: "evaluation",
      opportunityId: PROBE_OPP_ID,
    });
    const verified = verifyPublicToken(token, {
      purpose: "evaluation",
      opportunityId: PROBE_OPP_ID,
    });
    const url = buildEvaluationUrl(PROBE_OPP_ID, "https://example.test");

    if (!verified?.opportunityId || !url.includes("/avaliacao/")) {
      return {
        status: "FAIL",
        message: "Evaluation token round-trip failed.",
      };
    }

    return {
      status: "PASS",
      message: "Evaluation portal HMAC tokens are valid.",
      details: { urlPrefix: url.split("?")[0] },
    };
  },
});
