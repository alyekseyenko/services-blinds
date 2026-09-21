"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { db, SyncQueueItem } from "@/lib/db";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SyncQueueSheetProps {
  open: boolean;
  onClose: () => void;
  pendingCount: number;
  failedCount: number;
  onRetry: () => void;
}

export default function SyncQueueSheet({
  open,
  onClose,
  pendingCount,
  failedCount,
  onRetry,
}: SyncQueueSheetProps) {
  const [items, setItems] = useState<SyncQueueItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const rows = await db.syncQueue.toArray();
      setItems(rows.sort((a, b) => b.timestamp - a.timestamp));
    };
    load();
  }, [open, pendingCount, failedCount]);

  const discard = async (id?: number) => {
    if (!id) return;
    await db.syncQueue.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <Dialog open={open} onClose={onClose} title="Fila de Sincronização" description="Alterações guardadas localmente">
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="warning">{pendingCount} pendente{pendingCount !== 1 ? "s" : ""}</Badge>
        {failedCount > 0 && <Badge variant="error">{failedCount} falhou</Badge>}
      </div>

      {items.length === 0 ? (
        <p className="text-sm font-semibold text-slate-600">Nenhuma alteração na fila.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-slate-800">{item.action}</p>
                <p className="truncate text-xs font-semibold text-slate-600">
                  {item.taskId || "—"}
                </p>
                {item.status === "failed" && item.lastError && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{item.lastError}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {item.status === "failed" && (
                  <Button size="sm" variant="outline" onClick={onRetry} className="min-h-10">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => discard(item.id)} className="min-h-10 text-red-600">
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
