"use client";

import { useEffect, useState } from "react";
import { ImageIcon, RefreshCw, Trash2 } from "lucide-react";
import { db, SyncQueueItem, type VisitPhotoQueueItem } from "@/lib/db";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { labelSyncQueueAction } from "@/lib/ui/ptPtDisplay";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { toUserMessage } from "@/lib/userMessages";
import {
  drainVisitPhotoQueue,
  resetSingleFailedQueueItem,
} from "@/lib/sync/syncQueueRetry";

interface SyncQueueSheetProps {
  open: boolean;
  onClose: () => void;
  pendingCount: number;
  failedCount: number;
  onRetry: () => void;
  onRetryItem?: (itemId: number) => void;
  onAfterDiscard?: () => void;
  resolveTaskLabel?: (taskId: string) => string;
}

export default function SyncQueueSheet({
  open,
  onClose,
  pendingCount,
  failedCount,
  onRetry,
  onRetryItem,
  onAfterDiscard,
  resolveTaskLabel,
}: SyncQueueSheetProps) {
  const confirm = useConfirm();
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [photoItems, setPhotoItems] = useState<VisitPhotoQueueItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const rows = await db.syncQueue.toArray();
      const photos = await db.visitPhotoQueue.toArray();
      setItems(rows.sort((a, b) => b.timestamp - a.timestamp));
      setPhotoItems(photos.sort((a, b) => b.capturedAt - a.capturedAt));
    };
    void load();
  }, [open, pendingCount, failedCount]);

  const discard = async (item: SyncQueueItem) => {
    if (!item.id) return;
    const ok = await confirm({
      title: "Descartar alteração?",
      description:
        "Esta alteração será removida do telemóvel e não chegará ao CRM. Esta ação não pode ser anulada.",
      confirmLabel: "Descartar",
      cancelLabel: "Manter",
      destructive: true,
    });
    if (!ok) return;
    await db.syncQueue.delete(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    onAfterDiscard?.();
  };

  const discardPhoto = async (photo: VisitPhotoQueueItem) => {
    if (!photo.id) return;
    const ok = await confirm({
      title: "Descartar foto?",
      description:
        "A foto será removida deste telemóvel e não será enviada ao CRM. Esta ação não pode ser anulada.",
      confirmLabel: "Descartar",
      cancelLabel: "Manter",
      destructive: true,
    });
    if (!ok) return;
    await db.visitPhotoQueue.delete(photo.id);
    setPhotoItems((prev) => prev.filter((p) => p.id !== photo.id));
    onAfterDiscard?.();
  };

  const retryPhoto = async (photo: VisitPhotoQueueItem) => {
    if (!photo.id) return;
    if (photo.status === "failed") {
      await db.visitPhotoQueue.update(photo.id, {
        status: "pending",
        retries: 0,
        lastError: undefined,
        nextRetryAt: undefined,
        transientAttempts: 0,
      });
    }
    await drainVisitPhotoQueue();
    const photos = await db.visitPhotoQueue.toArray();
    setPhotoItems(photos.sort((a, b) => b.capturedAt - a.capturedAt));
    onAfterDiscard?.();
  };

  const labelFor = (taskId: string) => {
    if (!taskId) return "—";
    return resolveTaskLabel?.(taskId) || taskId;
  };

  const photoLabel = (status: VisitPhotoQueueItem["status"]) => {
    if (status === "failed") return "Falhou";
    if (status === "pending") return "Por enviar";
    return status;
  };

  const empty = items.length === 0 && photoItems.length === 0;

  return (
    <Dialog open={open} onClose={onClose} title="Fila de Sincronização" description="Alterações guardadas localmente" panelDataTour="tech-sync-queue">
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="warning">{pendingCount} pendente{pendingCount !== 1 ? "s" : ""}</Badge>
        {failedCount > 0 && <Badge variant="error">{failedCount} falhou</Badge>}
      </div>

      {empty ? (
        <p className="text-sm font-semibold text-muted-foreground">Nenhuma alteração na fila.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={`sync-${item.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-foreground">
                  {labelSyncQueueAction(item.action)}
                </p>
                <p className="truncate text-xs font-semibold text-muted-foreground">
                  {labelFor(item.taskId || "")}
                </p>
                {item.status === "failed" && item.lastError && (
                  <p className="mt-1 text-xs font-semibold text-danger-solid">
                    {toUserMessage(item.lastError, item.lastError)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {item.status === "failed" && item.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void resetSingleFailedQueueItem(item.id!).then(() => onRetryItem?.(item.id!));
                    }}
                    aria-label="Repetir este item"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void discard(item)}
                  className="text-danger-solid"
                  aria-label="Descartar item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {photoItems.map((photo) => (
            <li
              key={`photo-${photo.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-foreground">
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Foto da visita
                </p>
                <p className="truncate text-xs font-semibold text-muted-foreground">
                  {labelFor(photo.taskId)} · {photoLabel(photo.status)}
                </p>
                {photo.status === "failed" && photo.lastError && (
                  <p className="mt-1 text-xs font-semibold text-danger-solid">
                    {toUserMessage(photo.lastError, photo.lastError)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                {(photo.status === "failed" || photo.status === "pending") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void retryPhoto(photo)}
                    aria-label="Repetir envio da foto"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void discardPhoto(photo)}
                  className="text-danger-solid"
                  aria-label="Descartar foto"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        {(pendingCount > 0 || failedCount > 0) && (
          <Button onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar sincronizar
          </Button>
        )}
      </div>
    </Dialog>
  );
}