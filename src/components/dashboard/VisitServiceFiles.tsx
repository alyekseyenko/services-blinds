"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { summarizeVisitServiceFileList } from "@/lib/visits/visitServiceFiles";
import { ChevronDown, FileText, ImageIcon, Loader2, CloudOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { isBrowserOnline } from "@/lib/networkOnline";
import {
  VisitServiceFilesListResponseSchema,
  type VisitServiceFileListItem,
} from "@/lib/schemas/visitServiceFiles";
import { Dialog } from "@/components/ui/Dialog";

export interface VisitServiceFilesProps {
  taskId: string;
  opportunityId: string;
  /** Dentro do cartão «Fotos (opcional)» — menos padding e sem segundo cartão. */
  variant?: "standalone" | "embedded";
}

function formatFileDate(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function VisitServiceFiles({
  taskId,
  opportunityId,
  variant = "standalone",
}: VisitServiceFilesProps) {
  const embedded = variant === "embedded";
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<VisitServiceFileListItem[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const previewFile = useMemo(
    () => files.find((f) => f.id === previewId) ?? null,
    [files, previewId]
  );

  const fileUrl = useCallback(
    (attachmentId: string) =>
      `/api/opportunities/${encodeURIComponent(opportunityId)}/files/${encodeURIComponent(
        attachmentId
      )}?taskId=${encodeURIComponent(taskId)}`,
    [opportunityId, taskId]
  );

  const loadList = useCallback(async () => {
    if (!isBrowserOnline()) {
      setError("Precisas de rede para ver os ficheiros.");
      setLoaded(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/opportunities/${encodeURIComponent(opportunityId)}/files?taskId=${encodeURIComponent(taskId)}`,
        { credentials: "include", method: "GET" }
      );
      const json: unknown = await res.json();
      if (!res.ok) {
        const message =
          json && typeof json === "object" && "error" in json && typeof json.error === "string"
            ? json.error
            : "Não foi possível carregar os ficheiros.";
        setError(message);
        setFiles([]);
      } else {
        const parsed = VisitServiceFilesListResponseSchema.safeParse(json);
        if (!parsed.success) {
          console.warn("[VisitServiceFiles] Resposta inválida", parsed.error.flatten());
          setError("Não foi possível carregar os ficheiros.");
          setFiles([]);
        } else {
          setFiles(parsed.data.files);
          setError(null);
        }
      }
      setLoaded(true);
    } catch {
      setError("Não foi possível carregar os ficheiros.");
      setFiles([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [opportunityId, taskId]);

  useEffect(() => {
    if (!loaded && !loading) {
      void loadList();
    }
  }, [loadList, loaded, loading]);

  const summaryLine = useMemo(() => {
    if (!isBrowserOnline() && !loaded) {
      return "Precisas de rede para saber quantos ficheiros há no CRM.";
    }
    if (loading && !loaded) {
      return "A verificar ficheiros no CRM…";
    }
    if (error) {
      return error;
    }
    if (loaded) {
      return summarizeVisitServiceFileList(files);
    }
    return "A verificar ficheiros no CRM…";
  }, [loading, loaded, error, files]);

  const collapsedButtonLabel = useMemo(() => {
    if (!loaded || loading) return "Ver ficheiros";
    if (files.length === 0) return "Ver ficheiros";
    return `Ver ficheiros (${files.length})`;
  }, [files.length, loaded, loading]);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded && !loading) {
      void loadList();
    }
  };

  const openFile = (file: VisitServiceFileListItem) => {
    if (file.kind === "image") {
      setPreviewId(file.id);
      return;
    }
    window.open(fileUrl(file.id), "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className={cn(
        embedded
          ? "mt-4 border-t border-border pt-4"
          : "mt-6 rounded-2xl border border-border bg-card p-4"
      )}
      data-tour="tech-visit-files"
    >
      <div>
        <h3
          className={cn(
            "text-xs font-black uppercase tracking-widest text-foreground",
            embedded && "sr-only"
          )}
        >
          Ficheiros do serviço
        </h3>
        <p
          className={cn(
            "text-xs font-semibold",
            error ? "text-warning-fg" : "text-muted-foreground",
            !embedded && "mt-1"
          )}
          role="status"
        >
          {summaryLine}
        </p>
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={handleToggle}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-muted text-xs font-black uppercase tracking-widest text-foreground transition-colors hover:border-primary"
        >
          {loading && !loaded ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              {collapsedButtonLabel}
            </span>
          ) : (
            collapsedButtonLabel
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-black uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary"
          aria-expanded
        >
          Ocultar
          <ChevronDown className="h-4 w-4 rotate-180" aria-hidden />
        </button>
      )}

      {expanded ? (
        <div className="mt-4">
          {loading ? (
            <div className="flex min-h-12 items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              A carregar ficheiros…
            </div>
          ) : error ? (
            <div className="flex min-h-12 items-start gap-2 text-xs font-semibold text-warning-fg">
              <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : loaded && files.length === 0 ? (
            <p className="text-xs font-semibold text-muted-foreground">
              Este serviço não tem ficheiros.
            </p>
          ) : (
            <ul className="grid gap-2">
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() => openFile(file)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-muted px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    {file.kind === "image" ? (
                      <ImageIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    ) : (
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">{file.name}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {file.extension}
                        {formatFileDate(file.createdAt) ? ` · ${formatFileDate(file.createdAt)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-primary">
                      {file.kind === "image" ? "Ver" : "Abrir"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {loaded && !loading && !error && files.length > 0 ? (
            <button
              type="button"
              onClick={() => void loadList()}
              className="mt-3 min-h-12 w-full rounded-xl border border-border bg-card text-xs font-black uppercase tracking-widest text-foreground transition-colors hover:border-primary"
            >
              Atualizar lista
            </button>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={previewId != null}
        onClose={() => setPreviewId(null)}
        title={previewFile?.name ?? "Imagem"}
        size="wide"
        scrollBody={false}
      >
        {previewFile ? (
          <div className="flex max-h-[70vh] items-center justify-center bg-muted p-2">
            <img
              src={fileUrl(previewFile.id)}
              alt={previewFile.name}
              className="max-h-[68vh] max-w-full rounded-lg object-contain"
            />
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}