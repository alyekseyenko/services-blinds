"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";

import { Plus, Ruler, Loader2 } from "lucide-react";

import { Task } from "@/types";
import type { MeasurementsPayload } from "@/lib/schemas";
import { summarizeMeasurementsFormProgress } from "@/lib/measurementCompleteness";
import { canAutoSubmitMeasurementsDraft } from "@/lib/measurements/draftStatus";
import {
  buildMeasurementsFocusedStatus,
  formatMeasurementsProgressSummary,
  getFormRemeasureState,
} from "@/lib/measurements/formStatusHelpers";

import { useMeasurements } from "@/hooks/useMeasurements";
import { useMeasurementsFormSave } from "@/hooks/measurements/useMeasurementsFormSave";

import { ProductGroupCard } from "./ProductGroupCard";
import type { MeasurementsFocusedStatus } from "./MeasurementsFocusStatusBar";
import { MeasurementsFormHeader } from "./form/MeasurementsFormHeader";
import { MeasurementsRemeasureCard } from "./form/MeasurementsRemeasureCard";

import { useToast } from "@/components/ui/ToastContext";

export type MeasurementsFormHandle = {
  save: () => Promise<void>;
  isSaving: boolean;
  addGroup: () => void;
  hasUnsavedChanges: boolean;
  canAutoSubmitDraft: () => boolean;
};

export type MeasurementsSaveBarMode = "external" | "inline";

interface MeasurementsFormProps {
  task?: Task;
  opportunityId?: string;
  onSave?: (data: MeasurementsPayload & { updatedAt?: string }) => Promise<{
    success: boolean;
    error?: string;
    queued?: boolean;
  }>;
  isAdmin?: boolean;
  /** Visita concluída / só leitura (técnico) — não confundir com painel admin. */
  readOnly?: boolean;
  /** external = barra fixa no pai (drawer); inline = botão no fim do formulário (sheet) */
  saveBarMode?: MeasurementsSaveBarMode;
  /** Esconde cabeçalhos do formulário (modo ecrã inteiro no drawer). */
  focusedLayout?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  /** Modo ecrã inteiro: estado agrupado no cabeçalho do drawer (em vez de linhas soltas no formulário). */
  onFocusedStatusChange?: (status: MeasurementsFocusedStatus) => void;
  /** Edição admin: começa nesta ficha e não recarrega o rascunho do técnico. */
  seedPayload?: MeasurementsPayload | null;
}

export function MeasurementsSaveButton({
  onClick,
  loading,
  className = "",
  dataTour,
}: {
  onClick: () => void;
  loading: boolean;
  className?: string;
  dataTour?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      lang="pt-PT"
      data-tour={dataTour}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-border-strong bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition-all active:scale-[0.99] hover:bg-primary-hover disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <Ruler className="h-5 w-5 text-foreground" aria-hidden />
      )}
      Guardar medições
    </button>
  );
}

const MeasurementsForm = forwardRef<MeasurementsFormHandle, MeasurementsFormProps>(
  function MeasurementsForm(
    {
      task,
      opportunityId,
      onSave,
      isAdmin = false,
      readOnly = false,
      saveBarMode = "external",
      focusedLayout = false,
      onDirtyChange,
      onFocusedStatusChange,
      seedPayload,
    },
    ref
  ) {
    const toast = useToast();

    const {
      productGroups,
      lastLocalSave,
      DRAFT_KEY,
      addGroup,
      cloneGroup,
      removeGroup,
      toggleGroup,
      collapseAllGroups,
      updateGroupType,
      updateGroupDetails,
      setRemeasure,
      cloneRow,
      addRow,
      removeRow,
      updateMeasurement,
      clearDraft,
      setLastLocalSave,
      isDirty,
    } = useMeasurements(task, opportunityId, seedPayload);

    const { loading, handleSave } = useMeasurementsFormSave({
      onSave,
      productGroups,
      clearDraft,
      setLastLocalSave,
      collapseAllGroups,
      toast,
    });

    useEffect(() => {
      onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    useImperativeHandle(
      ref,
      () => ({
        save: handleSave,
        isSaving: loading,
        addGroup,
        hasUnsavedChanges: isDirty,
        canAutoSubmitDraft: () => canAutoSubmitMeasurementsDraft(productGroups, isDirty),
      }),
      [handleSave, loading, addGroup, isDirty, productGroups]
    );

    const hasDraft = typeof window !== "undefined" && Boolean(localStorage.getItem(DRAFT_KEY));

    const progressSummary = useMemo(() => {
      const formProgress = summarizeMeasurementsFormProgress(productGroups);
      return formatMeasurementsProgressSummary(formProgress);
    }, [productGroups]);

    const focusedStatus = useMemo(
      (): MeasurementsFocusedStatus =>
        buildMeasurementsFocusedStatus({
          progressSummary,
          lastLocalSave,
          hasDraft: Boolean(hasDraft),
        }),
      [progressSummary, lastLocalSave, hasDraft]
    );

    useEffect(() => {
      if (!focusedLayout || isAdmin || !onFocusedStatusChange) return;
      onFocusedStatusChange(focusedStatus);
    }, [focusedLayout, isAdmin, onFocusedStatusChange, focusedStatus]);

    const showInlineSave = !isAdmin && onSave && saveBarMode === "inline";

    const remeasure = useMemo(
      () => getFormRemeasureState(productGroups, isAdmin || readOnly),
      [productGroups, isAdmin, readOnly]
    );

    return (
      <div
        data-tour="tech-measurements-form"
        className={`${focusedLayout ? "space-y-3" : "space-y-4 lg:space-y-6"} mx-auto w-full max-w-6xl animate-in fade-in duration-500 ${saveBarMode === "external" ? "pb-2" : "pb-4"}`}
      >
        <MeasurementsFormHeader
          isAdmin={isAdmin}
          focusedLayout={focusedLayout}
          onFocusedStatusChange={Boolean(onFocusedStatusChange)}
          progressSummary={progressSummary}
          lastLocalSave={lastLocalSave}
          hasDraft={Boolean(hasDraft)}
          productGroupCount={productGroups.length}
          onSave={Boolean(onSave)}
          addGroup={addGroup}
          task={task}
          loading={loading}
          onAdminSync={handleSave}
        />

        <MeasurementsRemeasureCard
          needed={remeasure.needed}
          note={remeasure.note}
          locked={remeasure.locked}
          onSetRemeasure={setRemeasure}
        />

        <div className="space-y-4">
          {productGroups.map((group, gIdx) => (
            <ProductGroupCard
              key={group.id}
              group={group}
              gIdx={gIdx}
              isAdmin={isAdmin}
              readOnly={readOnly}
              onToggleGroup={toggleGroup}
              onCloneGroup={cloneGroup}
              onRemoveGroup={removeGroup}
              onUpdateGroupType={updateGroupType}
              onUpdateGroupDetails={updateGroupDetails}
              onUpdateMeasurement={updateMeasurement}
              onCloneRow={cloneRow}
              onAddRow={addRow}
              onRemoveRow={removeRow}
              voiceObservationsTourAnchor={gIdx === 0 && !isAdmin && !readOnly}
            />
          ))}
          {!isAdmin && !readOnly ? (
            <button
              type="button"
              data-tour="tech-measurements-add-product-bottom"
              onClick={addGroup}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong bg-card px-4 py-3 text-xs font-black uppercase tracking-wider text-foreground transition-all hover:border-primary hover:bg-muted active:scale-[0.99]"
            >
              <Plus className="h-4 w-4 text-primary" aria-hidden />
              Adicionar outro produto nesta obra
            </button>
          ) : null}
        </div>

        {showInlineSave ? (
          <div className="pt-2">
            <MeasurementsSaveButton onClick={handleSave} loading={loading} />
          </div>
        ) : null}
      </div>
    );
  }
);

export default MeasurementsForm;