/** Client-only helpers for microphone permission UX (pt-PT). */

export type MicPermissionState = "granted" | "denied" | "prompt" | "unknown";

export async function queryMicrophonePermission(): Promise<MicPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }
  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") {
      return status.state;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** Instruções quando o microfone está bloqueado (não abre definições automaticamente). */
export function microphoneBlockedInstructions(): string {
  if (isIos()) {
    return (
      "O microfone está bloqueado. Em Ajustes → Privacidade e segurança → Microfone, active para Safari/Chrome. " +
      "Depois, em Ajustes → Apps → Safari → Microfone (ou no site: ícone «aA» na barra → Definições do website), permita o microfone para este site e recarregue a página."
    );
  }
  if (isAndroid()) {
    return (
      "Toque no ícone de cadeado ou «i» na barra do endereço → Permissões → Microfone → Permitir. " +
      "Se estiver desligado no telemóvel, active o microfone nas definições do sistema."
    );
  }
  return "Clique no cadeado junto ao endereço do site e permita o microfone. Depois tente outra vez.";
}

export function pickRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined;
}

export function describeGetUserMediaError(error: unknown): { title: string; body: string } {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      title: "Microfone bloqueado",
      body: microphoneBlockedInstructions(),
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      title: "Sem microfone",
      body: "Não foi encontrado microfone neste dispositivo.",
    };
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      title: "Microfone ocupado",
      body: "Outra app pode estar a usar o microfone. Feche-a e tente de novo.",
    };
  }
  if (name === "SecurityError") {
    return {
      title: "Ligação segura necessária",
      body: "A ditada só funciona com HTTPS. Abra o site pelo endereço oficial.",
    };
  }
  return {
    title: "Não foi possível gravar",
    body: "Verifique o microfone nas definições do telemóvel e do navegador e tente outra vez.",
  };
}
