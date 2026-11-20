"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2, CloudOff, AlertCircle } from "lucide-react";
import { db, type VisitPhotoQueueItem } from "@/lib/db";
import { cn } from "@/lib/cn";
import { VISIT_PHOTO_MAX_COUNT } from "@/lib/visits/visitPhoto";
import { compressVisitPhotoFile } from "@/lib/visits/visitPhotoCompress";
import { newVisitPhotoClientRequestId } from "@/lib/visits/visitPhotoQueue";
import { useToast } from "@/components/ui/ToastContext";
import { isBrowserOnline } from "@/lib/networkOnline";
import { VisitServiceFiles } from "@/components/dashboard/VisitServiceFiles";

type TrayPhoto = {
  key: string;
  previewUrl: string;
  status: VisitPhotoQueueItem["status"] | "sending";
  lastError?: string;
  localOnly: boolean;
  queueId?: number;
};

export interface VisitPhotoTrayProps {
  taskId: string;
  opportunityId?: string | null;
  disabled?: boolean;
  onQueueChanged?: () => void;
  onRequestSync?: () => void;
}

export function VisitPhotoTray({
  taskId,
  opportunityId,
  disabled,
  onQueueChanged,
  onRequestSync,
}: VisitPhotoTrayProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<TrayPhoto[]>([]);
  const [localCount, setLocalCount] = useState(0);

  const canAdd = Boolean(opportunityId) && !disabled && localCount < VISIT_PHOTO_MAX_COUNT;

  const refreshLocal = useCallback(async () => {
    const rows = await db.visitPhotoQueue
      .where("taskId")
      .equals(taskId)
      .toArray();
    rows.sort((a, b) => b.capturedAt - a.capturedAt);
    setLocalCount(rows.length);
    setPhotos((prev) => {
      prev.forEach((p) => {
        if (p.previewUrl.startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
      });
      const fromDb: TrayPhoto[] = rows.map((row) => ({
        key: row.clientRequestId,
        previewUrl: URL.createObjectURL(row.blob),
        status: row.status,
        lastError: row.lastError,
        localOnly: true,
        queueId: row.id,
      }));
      return fromDb;
    });
  }, [taskId]);

  useEffect(() => {
    void refreshLocal();
  }, [refreshLocal]);

  const sentForTaskHint = useMemo(() => {
    const pending = photos.filter((p) => p.status === "pending" || p.status === "sending").length;
  const failed = photos.filter((p) => p.status === "failed").length;
    if (pending === 0 && failed === 0) return null;
    if (failed > 0) {
      return `${failed} foto(s) com erro · ${pending} por enviar`;
    }
    return `${pending} foto(s) por enviar`;
  }, [photos]);

  const handlePick = async (file: File | undefined) => {
    if (!file || !opportunityId) return;
    if (localCount >= VISIT_PHOTO_MAX_COUNT) {
      toast.info("Limite de fotos", `Máximo ${VISIT_PHOTO_MAX_COUNT} fotos por visita.`);
      return;
    }

    setBusy(true);
    const clientRequestId = newVisitPhotoClientRequestId();
    try {
      const compressed = await compressVisitPhotoFile(file, clientRequestId);
      if (!compressed.ok) {
        toast.warning("Foto não adicionada", compressed.error);
        return;
      }

      await db.visitPhotoQueue.add({
        taskId,
        opportunityId,
        clientRequestId,
        filename: compressed.filename,
        blob: compressed.blob,
        capturedAt: Date.now(),
        status: "pending",
        retries: 0,
      });

      onQueueChanged?.();
      if (isBrowserOnline()) {
        onRequestSync?.();
      } else {
        toast.info("Foto guardada", "Será enviada para o serviço quando houver rede.");
      }
      await refreshLocal();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeLocal = async (queueId: number | undefined) => {
    if (!queueId) return;
    await db.visitPhotoQueue.delete(queueId);
    onQueueChanged?.();
    await refreshLocal();
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4" data-tour="tech-visit-photos">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
            Fotos (opcional)
          </h3>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Guardadas em Arquivos do serviço no CRM.
          </p>
          {sentForTaskHint ? (
            <p className="mt-1 text-xs font-semibold text-warning-fg">{sentForTaskHint}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={!canAdd || busy}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-border-strong bg-muted transition-colors",
              canAdd && !busy && "hover:border-primary hover:bg-primary/10",
              (!canAdd || busy) && "opacity-50"
            )}
            aria-label="Tirar ou escolher foto"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            ) : (
              <Camera className="h-5 w-5 text-foreground" aria-hidden />
            )}
          </button>
          <button
            type="button"
            disabled={!canAdd || busy}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-border-strong bg-muted transition-colors",
              canAdd && !busy && "hover:border-primary hover:bg-primary/10",
              (!canAdd || busy) && "opacity-50"
            )}
            aria-label="Escolher da galeria"
          >
            <ImagePlus className="h-5 w-5 text-foreground" aria-hidden />
          </button>
        </div>
      </div>

      {!opportunityId ? (
        <p className="text-xs font-semibold text-muted-foreground">
          Serviço sem oportunidade — fotos indisponíveis.
        </p>
      ) : (
        <VisitServiceFiles taskId={taskId} opportunityId={opportunityId} variant="embedded" />
      )}

      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo) => (
            <li
              key={photo.key}
              className="relative overflow-hidden rounded-xl border border-border bg-muted"
            >
              <div
                className="aspect-[4/3] w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${photo.previewUrl})` }}
                role="img"
                aria-label="Pré-visualização da foto"
              />
              <PhotoStatusBadge photo={photo} />
              {photo.localOnly && photo.queueId ? (
                <button
                  type="button"
                  onClick={() => void removeLocal(photo.queueId)}
                  className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg bg-ink/70 text-ink-foreground"
                  aria-label="Remover foto local"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => void handlePick(event.target.files?.[0])}
      />
    </section>
  );
}

function PhotoStatusBadge({ photo }: { photo: TrayPhoto }) {
  const base =
    "absolute bottom-1 left-1 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide";
  if (photo.status === "sending") {
    return (
      <span className={cn(base, "bg-info-surface text-info-fg")}>
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> A enviar
      </span>
    );
  }
  if (photo.status === "pending") {
    return (
      <span className={cn(base, "bg-warning-surface text-warning-fg")}>
        <CloudOff className="h-3 w-3" aria-hidden /> Por enviar
      </span>
    );
  }
  if (photo.status === "failed") {
    return (
      <span className={cn(base, "bg-danger-surface text-danger-fg")} title={photo.lastError}>
        <AlertCircle className="h-3 w-3" aria-hidden /> Erro
      </span>
    );
  }
  return null;
}