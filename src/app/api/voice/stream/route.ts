import { NextRequest, NextResponse } from "next/server";
import { canAccessTechnicianDashboard } from "@/lib/auth/rbac";
import { getAppSession } from "@/lib/auth/session.server";
import {
  abortGoogleStreamSession,
  createGoogleStreamSession,
  endGoogleStreamSession,
  mimeSupportsGoogleStreaming,
  writeGoogleStreamChunk,
} from "@/lib/voice/googleStreaming";
import {
  isGoogleStreamingConfigured,
  resolveVoiceProviderId,
} from "@/lib/voice/provider";
import { googleStreamingErrorMessage } from "@/lib/voice/streamingErrors";
import { consumeVoiceRateLimit } from "@/lib/voice/rateLimit";

async function requireTechnician() {
  const ctx = await getAppSession();
  if (!ctx?.user.role || !canAccessTechnicianDashboard(ctx.user.role)) {
    return null;
  }
  return ctx;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTechnician();
    if (!ctx) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    if (!isGoogleStreamingConfigured()) {
      return NextResponse.json(
        { success: false, error: "Ditada em tempo real indisponível." },
        { status: 503 }
      );
    }

    const rate = consumeVoiceRateLimit(ctx.user.id ?? ctx.user.email ?? "technician");
    if (!rate.ok) {
      return NextResponse.json({ success: false, error: rate.message }, { status: 429 });
    }

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const sessionId = String(form.get("sessionId") ?? "").trim();
      const chunk = form.get("chunk");
      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: "Sessão em falta." },
          { status: 400 }
        );
      }
      if (!chunk || !(chunk instanceof Blob)) {
        return NextResponse.json(
          { success: false, error: "Áudio em falta." },
          { status: 400 }
        );
      }
      const bytes = Buffer.from(await chunk.arrayBuffer());
      const { text } = writeGoogleStreamChunk(sessionId, ctx.user.id, bytes);
      return NextResponse.json({ success: true, data: { text } });
    }

    const body = (await req.json()) as {
      action?: string;
      mimeType?: string;
      sessionId?: string;
    };
    const action = body.action?.trim();

    if (action === "start") {
      const mimeType = body.mimeType?.trim() || "audio/webm";
      if (!mimeSupportsGoogleStreaming(mimeType)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Neste telemóvel a ditada em tempo real não está disponível; use parar e aguarde a transcrição.",
          },
          { status: 400 }
        );
      }
      const userKey = ctx.user.id ?? ctx.user.email ?? "technician";
      const sessionId = createGoogleStreamSession(userKey, mimeType);
      return NextResponse.json({
        success: true,
        data: { sessionId, provider: resolveVoiceProviderId() },
      });
    }

    if (action === "stop") {
      const sessionId = body.sessionId?.trim();
      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: "Sessão em falta." },
          { status: 400 }
        );
      }
      const text = await endGoogleStreamSession(sessionId, ctx.user.id);
      return NextResponse.json({ success: true, data: { text } });
    }

    if (action === "abort") {
      const sessionId = body.sessionId?.trim();
      if (sessionId) abortGoogleStreamSession(sessionId, ctx.user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Pedido inválido." },
      { status: 400 }
    );
  } catch (error: unknown) {
    const raw =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível processar a ditada.";
    const message = googleStreamingErrorMessage(raw);
    const status = message.includes("indisponível") ? 503 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
