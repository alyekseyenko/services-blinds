import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildEvaluationUrl } from "@/lib/publicTokens";
import { getPublicAppBaseUrl } from "@/lib/publicAppUrl";
import { verifyIncomingN8nWebhookSecret } from "@/lib/n8nPost";

const BodySchema = z.object({
  opportunityId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (!verifyIncomingN8nWebhookSecret(secret)) {
    return NextResponse.json(
      { error: "Não autorizado." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo JSON inválido." },
      { status: 400 }
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "opportunityId inválido." },
      { status: 400 }
    );
  }

  const evaluationUrl = buildEvaluationUrl(parsed.data.opportunityId, getPublicAppBaseUrl());

  return NextResponse.json({ evaluationUrl });
}
