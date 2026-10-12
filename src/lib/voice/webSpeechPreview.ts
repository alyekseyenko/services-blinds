/** Preview local (browser Web Speech API) — não substitui a ditada Google no servidor. */

export type WebSpeechPreviewHandle = {
  stop: () => void;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function isWebSpeechPreviewAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(getSpeechRecognitionCtor());
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | undefined {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Junta resultados finais + intermédios para mostrar ao utilizador. */
export function mergeSpeechPreviewSegments(
  finals: string[],
  interim: string
): string {
  const head = finals.map((f) => f.trim()).filter(Boolean).join(" ");
  const tail = interim.trim();
  if (!head) return tail;
  if (!tail) return head;
  return `${head} ${tail}`;
}

export function startWebSpeechPreview(
  onPreview: (text: string) => void
): WebSpeechPreviewHandle | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = "pt-PT";
  recognition.continuous = true;
  recognition.interimResults = true;

  const finals: string[] = [];
  let stopped = false;

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const piece = result[0]?.transcript?.trim() ?? "";
      if (!piece) continue;
      if (result.isFinal) finals.push(piece);
      else interim += `${piece} `;
    }
    onPreview(mergeSpeechPreviewSegments(finals, interim));
  };

  recognition.onerror = () => {
    /* mantém gravação; preview opcional */
  };

  recognition.onend = () => {
    if (!stopped) {
      try {
        recognition.start();
      } catch {
        /* ignore restart errors */
      }
    }
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      stopped = true;
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
