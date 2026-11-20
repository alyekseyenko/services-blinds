"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { CheckCircle, Clock, FileText, Layers } from "lucide-react";

import {
  createWarehouseOpportunityNoteAction,
  fetchWarehouseOpportunityNotesAction,
  updateWarehouseItemStatusAction,
} from "@/actions/warehouse-actions";
import type { AppNote } from "@/lib/crm/appTypes";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type {
  WarehouseGroup as Group,
  WarehouseMeasurement as Measurement,
  WarehouseService as Service,
} from "@/lib/warehouse/types";
import { PreparationCardHeader } from "./preparation/PreparationCardHeader";
import { PreparationItemRow } from "./preparation/PreparationItemRow";
import { PreparationNotesSection } from "./preparation/PreparationNotesSection";

export type { Measurement, Group, Service };

export interface PreparationCardProps {
  service: Service;
  onComplete: (serviceId: string) => Promise<unknown> | void;
}

export default function PreparationCard({ service, onComplete }: PreparationCardProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [isExpanded, setIsExpanded] = useState(false);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [itemStatuses, setItemStatuses] = useState<Record<string, string>>({});
  const [itemNoteTexts, setItemNoteTexts] = useState<Record<string, string>>({});
  const [savingItemNote, setSavingItemNote] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<AppNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!service.id) return;
    setLoadingNotes(true);
    try {
      const result = await fetchWarehouseOpportunityNotesAction(service.id);
      if (result.success) {
        setNotes(result.data || []);
      }
    } catch (e) {
      console.error("Error loading notes in warehouse:", e);
    } finally {
      setLoadingNotes(false);
    }
  }, [service.id]);

  useEffect(() => {
    if (isExpanded && service.id) {
      void loadNotes();
    }
  }, [isExpanded, service.id, loadNotes]);

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !service.id) return;
    setIsCreatingNote(true);
    try {
      const result = await createWarehouseOpportunityNoteAction(
        service.id,
        "Nota de Armazém",
        newNoteText.trim()
      );
      if (result.success) {
        setNewNoteText("");
        await loadNotes();
      } else {
        toast.error("Erro ao criar nota", result.error);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro ao criar nota", message);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const updateItemWarehouseStatus = async (
    groupId: string,
    rowIndex: number,
    itemId: string,
    newStatus: string
  ) => {
    const key = `${groupId}-${rowIndex}`;
    const isPrepared = newStatus === "PREPARADO";
    const oldStatus = itemStatuses[key];
    const oldCompleted = completedItems[key];

    if (!itemId || itemId.toString().length <= 10) {
      toast.warning(
        "Estado só local",
        "Este artigo não tem ID no CRM — a alteração não foi guardada no servidor."
      );
      return;
    }

    setItemStatuses((prev) => ({ ...prev, [key]: newStatus }));
    setCompletedItems((prev) => ({ ...prev, [key]: isPrepared }));

    try {
      const result = await updateWarehouseItemStatusAction(itemId, newStatus);
      if (!result.success) {
        setItemStatuses((prev) => ({ ...prev, [key]: oldStatus }));
        setCompletedItems((prev) => ({ ...prev, [key]: oldCompleted }));
        toast.error("Erro ao sincronizar", result.error || "Não foi possível atualizar o estado no CRM.");
      }
    } catch {
      setItemStatuses((prev) => ({ ...prev, [key]: oldStatus }));
      setCompletedItems((prev) => ({ ...prev, [key]: oldCompleted }));
      toast.error("Erro ao sincronizar", "Falha de ligação ao atualizar o artigo.");
    }
  };

  const handleAddItemNote = async (
    groupId: string,
    rowIndex: number,
    itemType: string,
    itemSize: string
  ) => {
    const key = `${groupId}-${rowIndex}`;
    const text = itemNoteTexts[key] || "";
    if (!text.trim() || !service.id) return;

    setSavingItemNote((prev) => ({ ...prev, [key]: true }));
    try {
      const title = `Nota de Armazém - ${itemType.replace("_", " ")} (${itemSize})`;
      const result = await createWarehouseOpportunityNoteAction(service.id, title, text.trim());
      if (result.success) {
        setItemNoteTexts((prev) => ({ ...prev, [key]: "" }));
        await loadNotes();
      } else {
        toast.error("Erro ao criar nota", result.error);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro ao criar nota", message);
    } finally {
      setSavingItemNote((prev) => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    const initialCompleted: Record<string, boolean> = {};
    const initialStatuses: Record<string, string> = {};
    if (service.measurements?.groups) {
      service.measurements.groups.forEach((g) => {
        g.measurements.forEach((m, idx) => {
          const key = `${g.id}-${idx}`;
          if (m.isPrepared) {
            initialCompleted[key] = true;
          }
          initialStatuses[key] = m.estadoDoArmazem || "EM_PREPARACAO";
        });
      });
    }
    setCompletedItems(initialCompleted);
    setItemStatuses(initialStatuses);
  }, [service]);

  const groups = service.measurements?.groups || [];

  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    groups.forEach((g) => {
      g.measurements.forEach((_, idx) => {
        total++;
        if (completedItems[`${g.id}-${idx}`]) done++;
      });
    });
    return { total, done, percent: total > 0 ? (done / total) * 100 : 0 };
  }, [groups, completedItems]);

  const toggleItem = async (groupId: string, rowIndex: number, itemId: string) => {
    const key = `${groupId}-${rowIndex}`;
    const currentStatus = itemStatuses[key] || "EM_PREPARACAO";
    const newStatus = currentStatus === "PREPARADO" ? "EM_PREPARACAO" : "PREPARADO";
    await updateItemWarehouseStatus(groupId, rowIndex, itemId, newStatus);
  };

  const handleFinish = async () => {
    if (stats.total > 0 && stats.done < stats.total) {
      const proceed = await confirm({
        title: "Finalizar com itens pendentes?",
        description: "Ainda existem itens por marcar como preparados. Deseja finalizar mesmo assim?",
        confirmLabel: "Finalizar",
        destructive: true,
      });
      if (!proceed) return;
    }
    setLoading(true);
    try {
      await onComplete(service.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro ao finalizar", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`bg-ink border-2 rounded-2xl overflow-hidden transition-all duration-500 shadow-2xl ${
        isExpanded ? "border-info-solid ring-4 ring-info-solid/30/10" : "border-border-strong hover:border-border"
      }`}
    >
      <PreparationCardHeader
        service={service}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        stats={stats}
      />

      {isExpanded ? (
        <div className="p-8 border-t border-border-strong bg-black/40 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-10">
            {groups.length > 0 ? (
              <div className="space-y-10">
                {groups.map((group, gIdx) => (
                  <div key={group.id || gIdx} className="relative">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 bg-info-solid/20 rounded-xl flex items-center justify-center text-info-fg">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-ink-foreground font-black text-lg uppercase tracking-tight">
                          {group.type.replace("_", " ")}
                        </h4>
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                          {group.details?.material || group.details?.model || "Modelo Base"}
                          {group.details?.ral ? ` • RAL ${group.details.ral}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {group.measurements.map((m, mIdx) => {
                        const key = `${group.id}-${mIdx}`;
                        return (
                          <PreparationItemRow
                            key={mIdx}
                            group={group}
                            measurement={m}
                            isDone={Boolean(completedItems[key])}
                            currentStatus={itemStatuses[key] || "EM_PREPARACAO"}
                            itemNoteText={itemNoteTexts[key] || ""}
                            savingItemNote={Boolean(savingItemNote[key])}
                            onToggleItem={() => toggleItem(group.id, mIdx, m.id)}
                            onUpdateStatus={(status) =>
                              updateItemWarehouseStatus(group.id, mIdx, m.id, status)
                            }
                            onItemNoteTextChange={(value) =>
                              setItemNoteTexts((prev) => ({ ...prev, [key]: value }))
                            }
                            onSubmitItemNote={() =>
                              handleAddItemNote(
                                group.id,
                                mIdx,
                                group.type,
                                `${m.width}x${m.height}mm`
                              )
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-border-strong">
                <FileText className="w-12 h-12 text-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-bold">Nenhum item de fabrico detetado.</p>
                <p className="text-muted-foreground text-xs mt-1 uppercase font-black tracking-widest">
                  Verifique as notas manuais abaixo
                </p>
              </div>
            )}

            <PreparationNotesSection
              notes={notes}
              loadingNotes={loadingNotes}
              newNoteText={newNoteText}
              isCreatingNote={isCreatingNote}
              onNewNoteTextChange={setNewNoteText}
              onAddNote={() => void handleAddNote()}
            />

            <div className="pt-8 border-t border-border-strong flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-3 h-3 rounded-full ${
                    stats.percent === 100 ? "bg-success-solid shadow-[0_0_15px_var(--success)]" : "bg-muted"
                  }`}
                />
                <div>
                  <p className="text-ink-foreground font-black text-sm uppercase tracking-tight">
                    {stats.percent === 100 ? "Ordem de Fabrico Completa" : "Aguardando Preparação"}
                  </p>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                    {stats.done} de {stats.total} itens verificados
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={loading}
                className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl min-h-12 ${
                  stats.percent === 100
                    ? "bg-success-solid text-ink-foreground hover:bg-success-surface shadow-success-border/20"
                    : "bg-info-solid text-ink-foreground hover:bg-info-solid shadow-info-solid/20/20"
                }`}
              >
                {loading ? <Clock className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {stats.percent === 100
                  ? "Finalizar e Enviar para Agendamento"
                  : "Concluir Ordem de Fabrico"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}