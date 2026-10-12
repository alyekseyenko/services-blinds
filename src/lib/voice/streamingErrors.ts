/** Mensagens pt-PT para falhas de streaming STT (Google + MediaRecorder). */

export function googleStreamingErrorMessage(detail: string): string {
  const lower = detail.toLowerCase();
  if (
    lower.includes("opus") ||
    lower.includes("sample rate") ||
    lower.includes("supported rates") ||
    lower.includes("invalid argument")
  ) {
    return (
      "A ditada em tempo real falhou neste dispositivo. Pare de gravar e aguarde — " +
      "o áudio será transcrito ao terminar."
    );
  }
  return detail.trim() || "Não foi possível processar a ditada.";
}

export function isVoiceStreamingEnabledByEnv(): boolean {
  const raw = process.env.VOICE_STREAMING_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Erros técnicos → pt-PT para toast da ditada. */
export function mapVoiceTranscribeUserMessage(message: string): string {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed) {
    return "Não foi possível transcrever. Tente de novo.";
  }
  if (
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("load failed") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout")
  ) {
    return "Falha de ligação ao servidor ou ao Google Speech. Verifique a internet e tente outra vez.";
  }
  if (lower.includes("opus") || lower.includes("supported rates")) {
    return "Formato de áudio não suportado. Tente gravar de novo (fale perto do microfone).";
  }
  if (lower.includes("fetch failed") && lower.includes("google")) {
    return "Não foi possível enviar o áudio ao Google. Tente uma gravação mais curta ou outra rede.";
  }
  if (trimmed.includes("Não foi possível") || trimmed.includes("indisponível")) {
    return trimmed;
  }
  return trimmed;
}
