import "server-only";

import { randomUUID } from "node:crypto";
import { SpeechClient } from "@google-cloud/speech";
import { VOICE_MAX_RECORD_MS } from "./limits";
import { needsFlacTranscode } from "./transcodeAudio";
import { combineStreamTranscript } from "./streamTranscript";

const SESSION_TTL_MS = VOICE_MAX_RECORD_MS + 90_000;
const MAX_BYTES_PER_SESSION = 2 * 1024 * 1024;

type GoogleStreamSession = {
  userId: string;
  mimeType: string;
  finals: string[];
  interim: string;
  bytesWritten: number;
  stream: ReturnType<SpeechClient["streamingRecognize"]>;
  createdAt: number;
  ended: boolean;
  endPromise: Promise<void>;
  endResolve: () => void;
  error: Error | null;
};

const sessions = new Map<string, GoogleStreamSession>();

let speechClient: SpeechClient | null = null;

function apiKey(): string {
  const key = process.env.GOOGLE_SPEECH_API_KEY?.trim();
  if (!key) {
    throw new Error("Ditada indisponível: configure GOOGLE_SPEECH_API_KEY.");
  }
  return key;
}

function getClient(): SpeechClient {
  if (!speechClient) {
    speechClient = new SpeechClient({ apiKey: apiKey() });
  }
  return speechClient;
}

function encodingForMime(mimeType: string): "WEBM_OPUS" | "OGG_OPUS" {
  const mime = mimeType.toLowerCase();
  if (mime.includes("ogg")) return "OGG_OPUS";
  return "WEBM_OPUS";
}

function purgeExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      try {
        if (!session.ended) session.stream.end();
      } catch {
        /* ignore */
      }
      sessions.delete(id);
    }
  }
}

function getSession(sessionId: string, userId: string): GoogleStreamSession {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) {
    throw new Error("Sessão de ditada inválida ou expirada.");
  }
  return session;
}

export function mimeSupportsGoogleStreaming(mimeType: string): boolean {
  return !needsFlacTranscode(mimeType);
}

export function countGoogleStreamSessionsForUser(userId: string): number {
  purgeExpiredSessions();
  let count = 0;
  for (const session of sessions.values()) {
    if (session.userId === userId && !session.ended) count++;
  }
  return count;
}

export function createGoogleStreamSession(userId: string, mimeType: string): string {
  if (!mimeSupportsGoogleStreaming(mimeType)) {
    throw new Error("Ditada em tempo real indisponível neste formato de gravação.");
  }

  purgeExpiredSessions();
  if (countGoogleStreamSessionsForUser(userId) >= 3) {
    throw new Error(
      "Demasiadas sessões de ditada em simultâneo. Termine uma gravação antes de iniciar outra."
    );
  }

  const id = randomUUID();
  let endResolve!: () => void;
  const endPromise = new Promise<void>((resolve) => {
    endResolve = resolve;
  });

  const recognizeStream = getClient().streamingRecognize({
    config: {
      encoding: encodingForMime(mimeType),
      languageCode: "pt-PT",
      alternativeLanguageCodes: ["pt-BR"],
      enableAutomaticPunctuation: true,
      model: "default",
    },
    interimResults: true,
  });

  const session: GoogleStreamSession = {
    userId,
    mimeType,
    finals: [],
    interim: "",
    bytesWritten: 0,
    stream: recognizeStream,
    createdAt: Date.now(),
    ended: false,
    endPromise,
    endResolve,
    error: null,
  };

  recognizeStream.on("data", (data) => {
    const result = data.results?.[0];
    const transcript = result?.alternatives?.[0]?.transcript?.trim();
    if (!result || !transcript) return;
    if (result.isFinal) {
      session.finals.push(transcript);
      session.interim = "";
    } else {
      session.interim = transcript;
    }
  });

  recognizeStream.on("error", (err: unknown) => {
    session.error = err instanceof Error ? err : new Error(String(err));
    session.ended = true;
    endResolve();
  });

  recognizeStream.on("end", () => {
    session.ended = true;
    endResolve();
  });

  sessions.set(id, session);
  return id;
}

export function writeGoogleStreamChunk(
  sessionId: string,
  userId: string,
  chunk: Buffer
): { text: string } {
  const session = getSession(sessionId, userId);
  if (session.ended) {
    throw new Error("Sessão de ditada já terminada.");
  }
  if (session.error) {
    throw session.error;
  }
  if (chunk.length === 0) {
    return { text: combineStreamTranscript(session.finals, session.interim) };
  }

  session.bytesWritten += chunk.length;
  if (session.bytesWritten > MAX_BYTES_PER_SESSION) {
    throw new Error("Áudio demasiado grande (máx. 2 MB).");
  }

  recognizeStreamWrite(session.stream, chunk);

  return { text: combineStreamTranscript(session.finals, session.interim) };
}

function recognizeStreamWrite(
  stream: ReturnType<SpeechClient["streamingRecognize"]>,
  chunk: Buffer
): void {
  const ok = stream.write(chunk);
  if (!ok) {
    /* backpressure — small mobile chunks; drop is unlikely */
  }
}

export async function endGoogleStreamSession(
  sessionId: string,
  userId: string
): Promise<string> {
  const session = getSession(sessionId, userId);
  if (!session.ended) {
    session.stream.end();
    await Promise.race([
      session.endPromise,
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error("Transcrição demorou demasiado. Tente de novo.")), 20_000);
      }),
    ]);
  }

  if (session.error) {
    sessions.delete(sessionId);
    throw session.error;
  }

  const text = combineStreamTranscript(session.finals, session.interim).trim();
  sessions.delete(sessionId);

  if (!text) {
    throw new Error("Não foi possível reconhecer voz. Tente de novo.");
  }
  return text;
}

export function abortGoogleStreamSession(sessionId: string, userId: string): void {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) return;
  try {
    if (!session.ended) session.stream.destroy();
  } catch {
    /* ignore */
  }
  sessions.delete(sessionId);
}
