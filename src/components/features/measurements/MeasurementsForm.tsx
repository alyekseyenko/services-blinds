"use client";
import React, { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Plus, Ruler, Zap, Download, Printer, Loader2 } from "lucide-react";
import { Task } from "@/types";
import { useMeasurements } from "@/hooks/useMeasurements";
import { ProductGroupCard } from "./ProductGroupCard";

import { useToast } from "@/components/ui/ToastContext";
import { COMPANY_LABEL } from "@/lib/branding";
import { toUserMessage } from "@/lib/userMessages";
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
  onSave?: (data: any) => Promise<{ success: boolean; error?: string; queued?: boolean }>;
  isAdmin?: boolean;
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
      cloneRow,
      addRow,
      removeRow,
      updateMeasurement,
      clearDraft,
      setLastLocalSave,
    } = useMeasurements(task, opportunityId);

    const handleSave = useCallback(async () => {
      if (!onSave) return;
      setLoading(true);
      try {
        const data = {
          groups: productGroups,
          updatedAt: new Date().toISOString(),
        };

        const result = await onSave(data);

        if (result && result.success) {
          clearDraft();
          setLastLocalSave(null);
          if (result.queued) {
            toast.info(
              "Medições guardadas no telemóvel",
              "Serão enviadas para o CRM quando houver rede."
            );
          } else {
            toast.success(
              "Medições guardadas",
              "As medições e os produtos foram sincronizados com o CRM."
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

    const getProductLabel = (type: string) => {
      const labels: Record<string, string> = {
        ESTORE_EXTERIOR: "Estore Exterior",
        ESTORE_INTERIOR: "Estore Interior",
        TOLDO: "Toldo",
        MOSQUITEIRO: "Mosquiteiro",
      };
      return labels[type] || type;
    };

    const exportToExcel = () => {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent +=
        "Produto,Material/Modelo,RAL/Cor,Tecido,Referência,Acionamento,Quantidade,Largura(mm),Altura(mm),Fixação,Comandos,Notas,Preço\n";

      productGroups.forEach((g) => {
        const type = getProductLabel(g.type);
        const material =
          g.details.material === "OUTRO"
            ? g.details.otherMaterial
            : g.details.material || g.details.model;

        g.measurements.forEach((m) => {
          const row = [
            type,
            material,
            g.details.ral || "",
            g.details.fabric || "",
            g.details.reference || "",
            g.details.activation || "",
            m.qty,
            m.width,
            m.height,
            m.fixation || "",
            m.controls || "",
            m.notes || "",
            m.price || "",
          ]
            .map((val) => `"${val}"`)
            .join(",");
          csvContent += row + "\n";
        });
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Medicoes_NSI_${task?.nsi || "N-A"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const hasDraft = typeof window !== "undefined" && localStorage.getItem(DRAFT_KEY);

    const showInlineSave = !isAdmin && onSave && saveBarMode === "inline";

    return (
      <div
        data-tour="tech-measurements-form"
        className={`${focusedLayout ? "space-y-3" : "space-y-4 md:space-y-6"} animate-in fade-in duration-500 ${saveBarMode === "external" ? "pb-2" : "pb-4"}`}
      >
        {focusedLayout && !isAdmin && (lastLocalSave || hasDraft) ? (
          <p className="text-center text-[11px] font-bold text-muted-foreground print:hidden">
            {lastLocalSave ? (
              <span className="text-success-fg">Rascunho guardado às {lastLocalSave}</span>
            ) : (
              <span data-tour="tech-measurements-draft-status" className="text-warning-solid">
                Rascunho ativo no telemóvel
              </span>
            )}
          </p>
        ) : null}
        <div className="hidden print:block border-b-4 border-border pb-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="ds-title text-4xl tracking-tighter text-foreground">
                Ficha Técnica de Medição
              </h1>
              <p className="text-xl font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                {COMPANY_LABEL}
              </p>
            </div>
            <div className="text-right">
              <div className="bg-ink text-ink-foreground px-6 py-2 rounded-xl text-xl font-black">
                NSI #{task?.nsi || "N/D"}
              </div>
              <p className="text-sm font-bold text-muted-foreground mt-2">
                {new Date().toLocaleDateString("pt-PT", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-10 p-6 bg-muted rounded-3xl border-2 border-border">
            <div>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">
                Cliente
              </p>
              <p className="text-2xl font-black text-foreground">{task?.client || "Não especificado"}</p>
            </div>
            <div>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">
                Local da obra
              </p>
              <p className="text-lg font-bold text-foreground">{task?.address || "Não especificado"}</p>
            </div>
          </div>
        </div>

        {!isAdmin && !focusedLayout ? (
          <div
            className="flex items-center justify-between gap-2 rounded-2xl border border-border/90 bg-card px-3 py-2.5 shadow-sm print:hidden md:hidden"
          >
            <div className="min-w-0">
              <h3 className="text-sm font-black text-foreground tracking-tight">Medições de estores</h3>
              <div className="flex flex-wrap items-center gap-1">
                {lastLocalSave ? (
                  <span className="text-[11px] font-bold text-success-fg">
                    Rascunho · {lastLocalSave}
                  </span>
                ) : hasDraft ? (
                  <span
                    data-tour="tech-measurements-draft-status"
                    className="text-[11px] font-bold text-warning-solid"
                  >
                    Rascunho ativo
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-muted-foreground">
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
          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted border-2 border-border rounded-3xl print:hidden ${
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
            {isAdmin && (
              <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                {hasDraft && task && (!task.report || !task.report.includes("[MEASUREMENTS]")) && (
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-danger-solid text-ink-foreground rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-danger-solid/90 transition-all shadow-md animate-pulse"
                    title="Enviar medidas que ficaram esquecidas no telemóvel"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ruler className="w-4 h-4" />}
                    Sincronizar
                  </button>
                )}
                <button
                  onClick={exportToExcel}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-success-surface text-success-fg border-2 border-success-border rounded-2xl hover:bg-success-surface transition-all text-xs font-black uppercase tracking-wider"
                  title="Exportar para Excel (.csv)"
                >
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-muted text-foreground rounded-2xl hover:bg-secondary transition-all text-xs font-black uppercase tracking-wider"
                  title="Gerar PDF profissional"
                >
                  <Printer className="w-4 h-4" /> PDF
                </button>
              </div>
            )}
            {!isAdmin && onSave && (
              <button
                type="button"
                data-tour="tech-measurements-add-product"
                onClick={addGroup}
                className="hidden md:flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-3 bg-ink hover:bg-ink/90 text-ink-foreground rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4 text-primary" /> Novo produto
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 print:space-y-12">
          {productGroups.map((group, gIdx) => (
            <ProductGroupCard
              key={group.id}
              group={group}
              gIdx={gIdx}
              isAdmin={isAdmin}
              onToggleGroup={toggleGroup}
              onCloneGroup={cloneGroup}
              onRemoveGroup={removeGroup}
              onUpdateGroupType={updateGroupType}
              onUpdateGroupDetails={updateGroupDetails}
              onUpdateMeasurement={updateMeasurement}
              onCloneRow={cloneRow}
              onAddRow={addRow}
              onRemoveRow={removeRow}
            />
          ))}
        </div>

        {showInlineSave && (
          <div className="print:hidden pt-2">
            <MeasurementsSaveButton onClick={handleSave} loading={loading} />
          </div>
        )}
      </div>
    );
  }
);

export default MeasurementsForm;
