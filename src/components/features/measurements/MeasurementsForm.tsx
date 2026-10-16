"use client";

import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";

import { Plus, Ruler, Zap, Loader2 } from "lucide-react";

import { Task } from "@/types";
import type { MeasurementsPayload } from "@/lib/schemas";
import { productGroupsToMeasurementsPayload } from "@/lib/measurementsUtils";
import { summarizeMeasurementsFormProgress } from "@/lib/measurementCompleteness";

import { useMeasurements } from "@/hooks/useMeasurements";

import { ProductGroupCard } from "./ProductGroupCard";



import { useToast } from "@/components/ui/ToastContext";

import { toUserMessage } from "@/lib/userMessages";

import { hapticConfirmAfterAsync, hapticTap } from "@/lib/haptics";

import { isTransientSyncError } from "@/lib/sync/syncQueuePolicy";



export type MeasurementsFormHandle = {

  save: () => Promise<void>;

  isSaving: boolean;

  addGroup: () => void;

};



export type MeasurementsSaveBarMode = "external" | "inline";



interface MeasurementsFormProps {

  task?: Task;

  opportunityId?: string;

  onSave?: (data: MeasurementsPayload & { updatedAt?: string }) => Promise<{ success: boolean; error?: string; queued?: boolean }>;

  isAdmin?: boolean;

  /** Visita concluída / só leitura (técnico) — não confundir com painel admin. */
  readOnly?: boolean;

  /** external = barra fixa no pai (drawer); inline = botão no fim do formulário (sheet) */

  saveBarMode?: MeasurementsSaveBarMode;

  /** Esconde cabeçalhos do formulário (modo ecrã inteiro no drawer). */

  focusedLayout?: boolean;

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

    },

    ref

  ) {

    const toast = useToast();

    const [loading, setLoading] = useState(false);

    const {

      productGroups,

      lastLocalSave,

      DRAFT_KEY,

      addGroup,

      cloneGroup,

      removeGroup,

      toggleGroup,

      updateGroupType,

      updateGroupDetails,

      setRemeasure,

      cloneRow,

      addRow,

      removeRow,

      updateMeasurement,

      clearDraft,

      setLastLocalSave,

    } = useMeasurements(task, opportunityId);



    const handleSave = useCallback(async () => {

      if (!onSave) return;

      hapticTap();

      setLoading(true);

      try {

        const payload = productGroupsToMeasurementsPayload(productGroups);
        const data: MeasurementsPayload & { updatedAt: string } = {
          ...payload,
          updatedAt: new Date().toISOString(),
        };

        const result = await onSave(data);



        if (result && result.success) {

          hapticConfirmAfterAsync("success");

          clearDraft();

          setLastLocalSave(null);

          if (result.queued) {

            toast.info(

              "Medições guardadas no telemóvel",

              "Serão enviadas quando houver rede. O escritório verá a ficha em Medições após sincronizar."

            );

          } else {

            toast.success(

              "Medições guardadas",

              "Ficha disponível no escritório (Medições). Produtos sincronizados com o CRM."

            );

          }

        } else {

          const err = result?.error || "O servidor não confirmou a gravação.";

          toast.error("Erro ao guardar medições", toUserMessage(err, err));

        }

      } catch (e: unknown) {

        const raw = e instanceof Error ? e.message : "";

        if (isTransientSyncError(raw) || !raw) {

          toast.warning(

            "Rascunho protegido",

            "Erro de ligação com o servidor. O rascunho continua no telemóvel por segurança."

          );

        } else {

          toast.error("Erro ao guardar medições", toUserMessage(e, "Não foi possível guardar as medições."));

        }

      } finally {

        setLoading(false);

      }

    }, [onSave, productGroups, clearDraft, setLastLocalSave, toast]);



    useImperativeHandle(

      ref,

      () => ({

        save: handleSave,

        isSaving: loading,

        addGroup,

      }),

      [handleSave, loading, addGroup]

    );



    const hasDraft = typeof window !== "undefined" && localStorage.getItem(DRAFT_KEY);

    const formProgress = useMemo(
      () => summarizeMeasurementsFormProgress(productGroups),
      [productGroups]
    );

    const progressSummary = useMemo(() => {
      const { productCount, windowCount, incompleteRows } = formProgress;
      const products =
        productCount === 1 ? "1 produto" : `${productCount} produtos`;
      const windows =
        windowCount === 1 ? "1 janela" : `${windowCount} janelas`;
      const incomplete =
        incompleteRows === 0
          ? null
          : incompleteRows === 1
            ? "1 incompleta"
            : `${incompleteRows} incompletas`;
      return [products, windows, incomplete].filter(Boolean).join(" · ");
    }, [formProgress]);



    const showInlineSave = !isAdmin && onSave && saveBarMode === "inline";



    return (

      <div

        data-tour="tech-measurements-form"

        className={`${focusedLayout ? "space-y-3" : "space-y-4 md:space-y-6"} animate-in fade-in duration-500 ${saveBarMode === "external" ? "pb-2" : "pb-4"}`}

      >

        {focusedLayout && !isAdmin ? (
          <p
            className="text-center text-xs font-bold text-muted-foreground"
            data-tour="tech-measurements-progress"
          >
            {progressSummary}
          </p>
        ) : null}

        {focusedLayout && !isAdmin && (lastLocalSave || hasDraft) ? (

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

          <div

            className="flex items-center justify-between gap-2 rounded-2xl border border-border/90 bg-card px-3 py-2.5 shadow-sm md:hidden"

          >

            <div className="min-w-0">

              <h3 className="text-sm font-black text-foreground tracking-tight">Medições de estores</h3>

              <div className="flex flex-wrap items-center gap-1">

                {lastLocalSave ? (

                  <span className="text-xs font-bold text-success-fg">

                    Rascunho · {lastLocalSave}

                  </span>

                ) : hasDraft ? (

                  <span

                    data-tour="tech-measurements-draft-status"

                    className="text-xs font-bold text-warning-solid"

                  >

                    Rascunho ativo

                  </span>

                ) : (

                  <span className="text-xs font-bold text-muted-foreground">

                    {productGroups.length} produto{productGroups.length === 1 ? "" : "s"}

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

            focusedLayout ? "hidden" : !isAdmin ? "hidden md:flex" : ""

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

              <div className="flex flex-wrap items-center gap-1.5">

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

                onClick={handleSave}

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

                className="hidden md:flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-3 bg-ink hover:bg-ink/90 text-ink-foreground rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 min-h-12"

              >

                <Plus className="w-4 h-4 text-primary" /> Novo produto

              </button>

            )}

          </div>

        </div>



        {(() => {
          const answer = productGroups.find((g) => g.details.remeasureNeeded)?.details;
          const needed = answer?.remeasureNeeded ?? "";
          const note = answer?.remeasureNote ?? "";
          const locked = isAdmin || readOnly;
          return (
            <div className="rounded-2xl border-2 border-border bg-card p-4 space-y-3">
              <p className="text-sm font-black text-foreground">Retificação de medidas</p>
              {locked ? (
                <p className="text-sm font-bold text-foreground">
                  {needed === "SIM"
                    ? "Sim"
                    : needed === "OUTROS"
                      ? note.trim()
                        ? `Outros: ${note.trim()}`
                        : "Outros"
                      : "—"}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { value: "SIM", label: "Sim" },
                        { value: "OUTROS", label: "Outros" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setRemeasure(needed === opt.value ? "" : opt.value, needed === opt.value ? "" : note)
                        }
                        className={`min-h-12 rounded-xl border-2 px-3 text-xs font-black uppercase ${
                          needed === opt.value
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {needed === "OUTROS" ? (
                    <input
                      type="text"
                      className="w-full min-h-12 rounded-xl border-2 border-border bg-card p-3 text-sm font-bold text-foreground outline-none focus:border-info-solid"
                      value={note}
                      placeholder="Indique o que é preciso…"
                      onChange={(e) => setRemeasure("OUTROS", e.target.value)}
                    />
                  ) : null}
                </>
              )}
            </div>
          );
        })()}

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

        </div>



        {showInlineSave && (

          <div className="pt-2">

            <MeasurementsSaveButton onClick={handleSave} loading={loading} />

          </div>

        )}

      </div>

    );

  }

);



export default MeasurementsForm;


