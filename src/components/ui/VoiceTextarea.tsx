"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";
import { VOICE_MAX_RECORD_MS } from "@/lib/voice/limits";
import {
  describeGetUserMediaError,
  pickRecordingMimeType,
} from "@/lib/voice/micPermission";
import { mapVoiceTranscribeUserMessage } from "@/lib/voice/streamingErrors";
import {
  isWebSpeechPreviewAvailable,
  startWebSpeechPreview,
  type WebSpeechPreviewHandle,
} from "@/lib/voice/webSpeechPreview";
import { hapticTap } from "@/lib/haptics";

function appendTranscription(current: string, fragment: string): string {
  const piece = fragment.trim();
  if (!piece) return current;
  const base = current.trimEnd();
  if (!base) return piece;
  return `${base} ${piece}`;
}

type VoiceTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
  textareaClassName?: string;
  dataTour?: string;
};

export function VoiceTextarea({
  value,
  onChange,
  disabled = false,
  rows = 2,
  placeholder,
  className = "",
  textareaClassName = "",
  dataTour,
}: VoiceTextareaProps) {
  const toast = useToast();
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [livePreview, setLivePreview] = useState("");
  const [previewActive, setPreviewActive] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechPreviewRef = useRef<WebSpeechPreviewHandle | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const stopSpeechPreview = useCallback(() => {
    speechPreviewRef.current?.stop();
    speechPreviewRef.current = null;
    setPreviewActive(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/voice/status", { credentials: "include" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          success?: boolean;
          data?: { available?: boolean };
        };
        if (!cancelled && json.success && json.data?.available) {
          setVoiceAvailable(true);
        }
      } catch {
        /* offline / sem sessão */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cleanupStream = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      stopSpeechPreview();
      cleanupStream();
    },
    [cleanupStream, stopSpeechPreview]
  );

  const uploadRecording = useCallback(
    async (blob: Blob, lastPreview: string) => {
      setTranscribing(true);
      if (lastPreview.trim()) {
        setLivePreview(lastPreview);
      }
      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        const res = await fetch("/api/voice/transcribe", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        let json: { success?: boolean; data?: { text?: string }; error?: string };
        try {
          json = (await res.json()) as typeof json;
        } catch {
          toast.error(
            "Ditada",
            mapVoiceTranscribeUserMessage(
              res.ok ? "Resposta inválida do servidor." : `HTTP ${res.status}`
            )
          );
          return;
        }
        if (!res.ok || !json.success || !json.data?.text) {
          toast.error(
            "Ditada",
            mapVoiceTranscribeUserMessage(json.error || "Não foi possível transcrever.")
          );
          return;
        }
        onChange(appendTranscription(valueRef.current, json.data.text));
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : "Sem ligação ao servidor.";
        toast.error("Ditada", mapVoiceTranscribeUserMessage(msg));
      } finally {
        setTranscribing(false);
        setLivePreview("");
      }
    },
    [onChange, toast]
  );

  const stopRecording = useCallback(() => {
    stopSpeechPreview();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setRecording(false);
  }, [stopSpeechPreview]);

  const startRecording = useCallback(async () => {
    if (disabled || transcribing || !voiceAvailable) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Ditada", "O microfone não está disponível neste dispositivo.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      toast.error(
        "Ditada",
        "Este navegador não suporta gravação. Use Chrome ou Safari actualizado."
      );
      return;
    }

    hapticTap();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error: unknown) {
      const { title, body } = describeGetUserMediaError(error);
      toast.error(title, body);
      return;
    }

    const mimeType = pickRecordingMimeType();
    if (!mimeType) {
      stream.getTracks().forEach((t) => t.stop());
      toast.error(
        "Ditada",
        "Este telemóvel não suporta o formato de gravação. Actualize o sistema ou use outro navegador."
      );
      return;
    }

    const previewSnapshotRef = { text: "" };

    try {
      streamRef.current = stream;
      chunksRef.current = [];
      setLivePreview("");
      setPreviewActive(false);

      if (isWebSpeechPreviewAvailable()) {
        const handle = startWebSpeechPreview((text) => {
          previewSnapshotRef.text = text;
          setLivePreview(text);
          setPreviewActive(true);
        });
        speechPreviewRef.current = handle;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const previewText = previewSnapshotRef.text;
        stopSpeechPreview();
        cleanupStream();
        if (blob.size > 0) {
          void uploadRecording(blob, previewText);
        } else {
          setLivePreview("");
        }
      };
      recorder.onerror = () => {
        stopSpeechPreview();
        cleanupStream();
        setRecording(false);
        setLivePreview("");
        toast.error("Ditada", "Erro na gravação. Tente de novo.");
      };

      recorder.start();
      setRecording(true);
      stopTimerRef.current = setTimeout(() => stopRecording(), VOICE_MAX_RECORD_MS);
    } catch (error: unknown) {
      stopSpeechPreview();
      cleanupStream();
      const { title, body } = describeGetUserMediaError(error);
      toast.error(title, body);
    }
  }, [
    cleanupStream,
    disabled,
    stopRecording,
    stopSpeechPreview,
    toast,
    transcribing,
    uploadRecording,
    voiceAvailable,
  ]);

  const micDisabled =
    disabled || transcribing || !voiceAvailable || typeof window === "undefined";

  const statusLine =
    transcribing && !recording
      ? "A confirmar no servidor (Google)…"
      : livePreview || (recording ? "A ouvir…" : "");

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} data-tour={dataTour}>
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || transcribing}
          className={textareaClassName}
        />
        {voiceAvailable ? (
          <button
            type="button"
            aria-label={recording ? "Parar gravação" : "Ditar texto"}
            aria-pressed={recording}
            disabled={micDisabled && !recording}
            onClick={() => {
              if (recording) stopRecording();
              else void startRecording();
            }}
            className={`flex h-12 min-h-12 w-12 min-w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-card transition-colors disabled:opacity-40 ${
              recording
                ? "border-danger-border bg-danger-surface text-danger-fg"
                : "text-foreground"
            }`}
          >
            {transcribing ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : recording ? (
              <Square className="h-5 w-5 fill-current" aria-hidden />
            ) : (
              <Mic className="h-5 w-5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {recording || transcribing ? (
        <div className="space-y-0.5" aria-live="polite" role="status">
          {previewActive && recording ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pré-visualização (o texto final pode diferir)
            </p>
          ) : null}
          <p className="text-xs font-medium text-foreground">{statusLine}</p>
        </div>
      ) : null}
    </div>
  );
}

type VoiceSummarizeButtonProps = {
  text: string;
  onSummarized: (text: string) => void;
  disabled?: boolean;
  className?: string;
};

export function VoiceSummarizeButton({
  text,
  onSummarized,
  disabled = false,
  className = "",
}: VoiceSummarizeButtonProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/voice/status", { credentials: "include" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          success?: boolean;
          data?: { summarizeAvailable?: boolean };
        };
        if (!cancelled && json.success && json.data?.summarizeAvailable) {
          setAvailable(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = async () => {
    if (!text.trim() || loading) return;
    hapticTap();
    setLoading(true);
    try {
      const { summarizeVisitTextAction } = await import("@/actions/voice-actions");
      const res = await summarizeVisitTextAction(text);
      if (!res.success || !res.data?.text) {
        toast.error("Resumo", res.error || "Não foi possível resumir.");
        return;
      }
      onSummarized(res.data.text);
      toast.success("Resumo", "Texto actualizado — pode editar antes de submeter.");
    } catch {
      toast.error("Resumo", "Sem ligação. O texto escrito mantém-se.");
    } finally {
      setLoading(false);
    }
  };

  if (!available || !text.trim()) return null;

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={() => void handleClick()}
      className={`min-h-12 rounded-xl border border-border bg-muted px-4 text-xs font-black uppercase tracking-widest text-foreground transition-opacity disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          A resumir…
        </span>
      ) : (
        "Resumir"
      )}
    </button>
  );
}
