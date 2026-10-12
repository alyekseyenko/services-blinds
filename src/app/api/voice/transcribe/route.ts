import { NextRequest, NextResponse } from "next/server";
import { canAccessTechnicianDashboard } from "@/lib/auth/rbac";
import { getAppSession } from "@/lib/auth/session.server";
import { VOICE_MAX_AUDIO_BYTES } from "@/lib/voice/limits";
import { consumeVoiceRateLimit } from "@/lib/voice/rateLimit";
import { getSpeechProvider, isSpeechProviderConfigured } from "@/lib/voice/provider";
import { mapVoiceTranscribeUserMessage } from "@/lib/voice/streamingErrors";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role || !canAccessTechnicianDashboard(ctx.user.role)) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    if (!isSpeechProviderConfigured()) {
      return NextResponse.json(
        { success: false, error: "Ditada indisponível." },
        { status: 503 }
      );
    }

    const rate = consumeVoiceRateLimit(ctx.user.id ?? ctx.user.email ?? "technician");
    if (!rate.ok) {
      return NextResponse.json({ success: false, error: rate.message }, { status: 429 });
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength) {
      const bytes = Number.parseInt(contentLength, 10);
      if (Number.isFinite(bytes) && bytes > VOICE_MAX_AUDIO_BYTES + 65_536) {
        return NextResponse.json(
          { success: false, error: "Áudio demasiado grande (máx. 2 MB)." },
          { status: 413 }
        );
      }
    }

    const form = await req.formData();
    const file = form.get("audio");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "Áudio em falta." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Gravação vazia." },
        { status: 400 }
      );
    }
    if (bytes.length > VOICE_MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { success: false, error: "Áudio demasiado grande (máx. 2 MB)." },
        { status: 413 }
      );
    }

    const mimeType = file.type || "audio/webm";
    const filename =
      file instanceof File && file.name ? file.name : "recording.webm";

    const text = await getSpeechProvider().transcribe({
      audio: bytes,
      mimeType,
      filename,
    });

    return NextResponse.json({ success: true, data: { text } });
  } catch (error: unknown) {
    const raw =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível transcrever o áudio.";
    const message = mapVoiceTranscribeUserMessage(raw);
    const status = message.includes("indisponível") ? 503 : 500;
    console.error("[voice/transcribe]", raw);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
