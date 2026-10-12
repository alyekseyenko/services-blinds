import "server-only";

import { spawn } from "node:child_process";

/** Converte gravações do iPhone (mp4/aac) para FLAC 16 kHz mono para o Google STT v1. */
export async function audioToFlac16kMono(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-f",
        "flac",
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] }
    );

    const out: Buffer[] = [];
    const err: Buffer[] = [];
    ffmpeg.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    ffmpeg.stderr.on("data", (chunk: Buffer) => err.push(chunk));
    ffmpeg.on("error", () => {
      reject(new Error("Conversão de áudio indisponível no servidor."));
    });
    ffmpeg.on("close", (code) => {
      if (code === 0 && out.length > 0) {
        resolve(Buffer.concat(out));
        return;
      }
      reject(
        new Error(
          "Não foi possível preparar o áudio para transcrição. Tente gravar de novo."
        )
      );
    });

    ffmpeg.stdin.write(buffer);
    ffmpeg.stdin.end();
  });
}

export function needsFlacTranscode(mimeType: string): boolean {
  const mime = mimeType.toLowerCase();
  return (
    mime.includes("mp4") ||
    mime.includes("m4a") ||
    mime.includes("aac") ||
    mime.includes("caf")
  );
}
