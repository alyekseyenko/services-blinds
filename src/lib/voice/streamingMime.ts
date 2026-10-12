/** Client-safe: formats that support server streaming (WebM/Opus). */

export function mimeSupportsVoiceStreaming(mimeType: string): boolean {
  const mime = mimeType.toLowerCase();
  if (
    mime.includes("mp4") ||
    mime.includes("m4a") ||
    mime.includes("aac") ||
    mime.includes("caf")
  ) {
    return false;
  }
  return mime.includes("webm") || mime.includes("ogg");
}
