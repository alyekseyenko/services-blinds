"use client";

import { Loader2, Plus, Ruler, Zap } from "lucide-react";

import type { Task } from "@/types";

type Props = {
  isAdmin: boolean;
  focusedLayout: boolean;
  onFocusedStatusChange?: boolean;
  progressSummary: string;
  lastLocalSave: string | null;
  hasDraft: boolean;
  productGroupCount: number;
  onSave?: boolean;
  addGroup: () => void;
  task?: Task;
  loading: boolean;
  onAdminSync: () => void;
};

export function MeasurementsFormHeader({
  isAdmin,
  focusedLayout,
  onFocusedStatusChange,
  progressSummary,
  lastLocalSave,
  hasDraft,
  productGroupCount,
  onSave,
  addGroup,
  task,
  loading,
  onAdminSync,
}: Props) {
  return (
    <>
      {focusedLayout && !isAdmin && !onFocusedStatusChange ? (
        <p
          className="text-center text-xs font-bold text-muted-foreground"
          data-tour="tech-measurements-progress"
        >
          {progressSummary}
        </p>
      ) : null}

      {focusedLayout && !isAdmin && !onFocusedStatusChange && (lastLocalSave || hasDraft) ? (
        <p className="text-center text-xs font-bold text-muted-foreground">
          {lastLocalSave ? (
            <span className="text-success-fg">Rascunho guardado às {lastLocalSave}</span>
          ) : (
            <span data-tour="tech-measurements-draft-status" className="text-warning-solid">
              Rascunho ativo no telemóvel
            </span>
          )}
        </p>
      ) : null}

      {!isAdmin && !focusedLayout ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/90 bg-card px-3 py-2.5 shadow-sm lg:hidden">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-foreground tracking-tight">Medições de estores</h3>
            <div className="flex flex-wrap items-center gap-2">
              {lastLocalSave ? (
                <span className="text-xs font-bold text-success-fg">Rascunho · {lastLocalSave}</span>
              ) : hasDraft ? (
                <span data-tour="tech-measurements-draft-status" className="text-xs font-bold text-warning-solid">
                  Rascunho ativo
                </span>
              ) : (
                <span className="text-xs font-bold text-muted-foreground">
                  {productGroupCount} produto{productGroupCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
          {onSave ? (
            <button
              type="button"
              data-tour="tech-measurements-add-product"
              onClick={addGroup}
              className="flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-xs font-black uppercase tracking-wide text-ink-foreground active:scale-95"
            >
              <Plus className="h-4 w-4 text-primary" aria-hidden />
              Produto
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted border-2 border-border rounded-3xl ${
          focusedLayout ? "hidden" : !isAdmin ? "hidden lg:flex" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-info-surface text-info-solid rounded-2xl">
            <Ruler className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="ds-title text-lg tracking-tight text-foreground">
              {isAdmin ? "Gestão de medidas" : "Medições de estores"}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-bold">Relatório técnico</span>
              {lastLocalSave && !isAdmin && (
                <span className="text-xs bg-success-surface/80 text-success-fg px-2 py-0.5 rounded-lg font-bold">
                  Gravado automaticamente às {lastLocalSave}
                </span>
              )}
              {!isAdmin && hasDraft && !lastLocalSave && (
                <span
                  data-tour="tech-measurements-draft-status"
                  className="text-xs bg-warning-surface text-warning-solid px-2 py-0.5 rounded-lg font-bold flex items-center gap-1"
                >
                  <Zap className="w-2.5 h-2.5 text-warning-solid" /> Rascunho ativo
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isAdmin && hasDraft && task && (!task.report || !task.report.includes("[MEASUREMENTS]")) && (
            <button
              onClick={onAdminSync}
              disabled={loading}
              className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-3 bg-danger-solid text-ink-foreground rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-danger-solid/90 transition-all shadow-md animate-pulse min-h-12"
              title="Enviar medidas que ficaram esquecidas no telemóvel"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ruler className="w-4 h-4" />}
              Sincronizar
            </button>
          )}
          {!isAdmin && onSave && (
            <button
              type="button"
              data-tour="tech-measurements-add-product"
              onClick={addGroup}
              className="hidden lg:flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-3 bg-ink hover:bg-ink/90 text-ink-foreground rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 min-h-12"
            >
              <Plus className="w-4 h-4 text-primary" /> Novo produto
            </button>
          )}
        </div>
      </div>
    </>
  );
}