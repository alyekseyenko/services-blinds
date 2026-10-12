import "server-only";

import { openAiSpeechProvider } from "./openai";
import type { SpeechProvider, TranscribeInput } from "./types";
import {
  buildGoogleRecognizeConfig,
  GOOGLE_RECOGNIZE_MODEL_FALLBACK,
} from "./googleRecognizeConfig";
import { audioToFlac16kMono } from "./transcodeAudio";

function apiKey(): string {
  const key = process.env.GOOGLE_SPEECH_API_KEY?.trim();
  if (!key) {
    throw new Error("Ditada indisponível: configure GOOGLE_SPEECH_API_KEY.");
  }
  return key;
}

function googleSpeechErrorMessage(status: number, detail: string): string {
  const lower = detail.toLowerCase();
  if (
    status === 403 &&
    (lower.includes("api_key_http_referrer_blocked") ||
      lower.includes("referer") ||
      lower.includes("referrer"))
  ) {
    return (
      "A chave Google está limitada ao site no browser. A ditada corre no servidor: " +
      "no Google Cloud, use restrição por IP do VPS (não só o domínio) e active a API Speech-to-Text."
    );
  }
  if (status === 403) {
    return "Google Speech recusou a chave. Verifique API Speech-to-Text e restrições no Google Cloud.";
  }
  try {
    const parsed = JSON.parse(detail) as { error?: { message?: string } };
    const msg = parsed.error?.message?.trim();
    if (msg) return msg;
  } catch {
    /* not json */
  }
  return detail || `Transcrição Google falhou (${status}).`;
}

export const googleSpeechProvider: SpeechProvider = {
  id: "google",

  async transcribe(input: TranscribeInput): Promise<string> {
    const key = apiKey();
    // WebM/Opus direct to Google falha em gravações > ~5s; FLAC 16 kHz mono é estável (iOS + Android).
    let audioBytes: Buffer;
    try {
      audioBytes = await audioToFlac16kMono(input.audio);
    } catch {
      throw new Error(
        "Não foi possível preparar o áudio no servidor. Tente gravar de novo."
      );
    }
    const url = "https://speech.googleapis.com/v1/speech:recognize";
    const audioContent = audioBytes.toString("base64");

    const recognize = async (model: string) => {
      const config = { ...buildGoogleRecognizeConfig(), model };
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({ config, audio: { content: audioContent } }),
        signal: AbortSignal.timeout(90_000),
      });
    };

    let res: Response;
    try {
      const primary = buildGoogleRecognizeConfig();
      res = await recognize(primary.model);
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        const lower = detail.toLowerCase();
        if (
          primary.model !== GOOGLE_RECOGNIZE_MODEL_FALLBACK &&
          (lower.includes("model") || lower.includes("not supported"))
        ) {
          res = await recognize(GOOGLE_RECOGNIZE_MODEL_FALLBACK);
        } else {
          throw new Error(googleSpeechErrorMessage(res.status, detail));
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Google Speech")) {
        throw error;
      }
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        detail.toLowerCase().includes("timeout") || detail.toLowerCase().includes("aborted")
          ? "A transcrição demorou demasiado. Grave um audio mais curto e tente de novo."
          : `fetch failed: ${detail}`
      );
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(googleSpeechErrorMessage(res.status, detail));
    }

    const json = (await res.json()) as {
      results?: Array<{ alternatives?: Array<{ transcript?: string }> }>;
    };
    const text = json.results
      ?.map((r) => r.alternatives?.[0]?.transcript?.trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!text) {
      throw new Error("Não foi possível reconhecer voz. Tente de novo.");
    }
    return text;
  },

  async summarize(text: string): Promise<string> {
    if (process.env.OPENAI_API_KEY?.trim()) {
      return openAiSpeechProvider.summarize(text);
    }
    throw new Error(
      "Resumo indisponível sem OPENAI_API_KEY. Edite o texto manualmente."
    );
  },
};
