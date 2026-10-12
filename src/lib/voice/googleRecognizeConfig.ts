import "server-only";

/** Vocabulário de campo — melhora reconhecimento no Google STT (pt-PT). */
const FIELD_SPEECH_PHRASES = [
  "estores",
  "estore",
  "persiana",
  "persianas",
  "rolo",
  "cortinado",
  "veneziana",
  "plissé",
  "blackout",
  "medição",
  "medições",
  "instalação",
  "manutenção",
  "remediação",
  "caixa",
  "calha",
  "trilho",
  "motor",
  "comando",
  "NIF",
  "cliente",
  "visita",
  "obra",
  "milímetros",
  "centímetros",
  "largura",
  "altura",
  "profundidade",
];

export type GoogleRecognizeConfig = {
  encoding: "FLAC";
  sampleRateHertz: 16000;
  languageCode: "pt-PT";
  enableAutomaticPunctuation: true;
  model: string;
  speechContexts: Array<{ phrases: string[]; boost: number }>;
};

export function buildGoogleRecognizeConfig(): GoogleRecognizeConfig {
  const model =
    process.env.GOOGLE_SPEECH_MODEL?.trim() ||
    process.env.VOICE_GOOGLE_MODEL?.trim() ||
    "latest_long";

  return {
    encoding: "FLAC",
    sampleRateHertz: 16000,
    languageCode: "pt-PT",
    enableAutomaticPunctuation: true,
    model,
    speechContexts: [{ phrases: FIELD_SPEECH_PHRASES, boost: 12 }],
  };
}

export const GOOGLE_RECOGNIZE_MODEL_FALLBACK = "default";
