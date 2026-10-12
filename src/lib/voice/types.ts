export type TranscribeInput = {
  audio: Buffer;
  mimeType: string;
  filename: string;
};

export type SpeechProvider = {
  id: "openai" | "google";
  transcribe(input: TranscribeInput): Promise<string>;
  summarize(text: string): Promise<string>;
};
