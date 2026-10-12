import "server-only";

import { googleSpeechProvider } from "./google";
import { openAiSpeechProvider } from "./openai";
import { isVoiceStreamingEnabledByEnv } from "./streamingErrors";
import type { SpeechProvider } from "./types";

export type VoiceProviderId = "openai" | "google";

export function resolveVoiceProviderId(): VoiceProviderId {
  const raw = process.env.VOICE_PROVIDER?.trim().toLowerCase();
  if (raw === "google") return "google";
  return "openai";
}

export function isSpeechProviderConfigured(): boolean {
  const id = resolveVoiceProviderId();
  if (id === "google") {
    return Boolean(process.env.GOOGLE_SPEECH_API_KEY?.trim());
  }
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Google STT streaming — desligado por defeito (pedaços WebM do MediaRecorder
 * quebram Opus no Google). Activar com VOICE_STREAMING_ENABLED=true quando houver PCM.
 */
export function isGoogleStreamingConfigured(): boolean {
  return (
    isVoiceStreamingEnabledByEnv() &&
    resolveVoiceProviderId() === "google" &&
    Boolean(process.env.GOOGLE_SPEECH_API_KEY?.trim())
  );
}

/** Resumo usa OpenAI (mesmo com VOICE_PROVIDER=google para ditada). */
export function isSummarizeConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getSpeechProvider(): SpeechProvider {
  const id = resolveVoiceProviderId();
  if (id === "google") return googleSpeechProvider;
  return openAiSpeechProvider;
}
