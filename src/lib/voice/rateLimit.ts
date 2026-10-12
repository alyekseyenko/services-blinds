const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 40;
const MAX_MAP_ENTRIES = 2_000;

const requestLog = new Map<string, number[]>();

function pruneMap(now: number): void {
  if (requestLog.size <= MAX_MAP_ENTRIES) return;
  for (const [key, times] of requestLog.entries()) {
    const recent = times.filter((t) => now - t < WINDOW_MS);
    if (recent.length === 0) requestLog.delete(key);
    else requestLog.set(key, recent);
  }
}

export function consumeVoiceRateLimit(
  userId: string
): { ok: true } | { ok: false; message: string } {
  const now = Date.now();
  pruneMap(now);
  const key = userId.trim() || "anonymous";
  const prev = requestLog.get(key) ?? [];
  const recent = prev.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      ok: false,
      message: "Muitos pedidos de ditada seguidos. Aguarde um minuto e tente novamente.",
    };
  }
  recent.push(now);
  requestLog.set(key, recent);
  return { ok: true };
}

export const VOICE_MAX_STREAM_SESSIONS_PER_USER = 3;
