import "server-only";

import type { SpeechProvider, TranscribeInput } from "./types";

const TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";
const CHAT_URL = "https://api.openai.com/v1/chat/completions";

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("Ditada indisponível: configure OPENAI_API_KEY.");
  }
  return key;
}

export const openAiSpeechProvider: SpeechProvider = {
  id: "openai",

  async transcribe(input: TranscribeInput): Promise<string> {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(input.audio)], { type: input.mimeType });
    form.append("file", blob, input.filename || "audio.webm");
    form.append("model", "whisper-1");
    form.append("language", "pt");
    form.append(
      "prompt",
      "Notas de técnico de estores em português de Portugal: persianas, rolo, medições, instalação, cliente, morada."
    );

    const res = await fetch(TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail || `Transcrição falhou (${res.status}).`);
    }

    const json = (await res.json()) as { text?: string };
    const text = json.text?.trim();
    if (!text) {
      throw new Error("Não foi possível reconhecer voz. Tente de novo.");
    }
    return text;
  },

  async summarize(text: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("Não há texto para resumir.");
    }

    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Resumes notas de técnico de estores em português de Portugal. Frases curtas, tom profissional. Não inventes factos nem medições. Máximo 6 frases.",
          },
          { role: "user", content: trimmed },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail || `Resumo falhou (${res.status}).`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const out = json.choices?.[0]?.message?.content?.trim();
    if (!out) {
      throw new Error("Não foi possível gerar o resumo.");
    }
    return out;
  },
};
