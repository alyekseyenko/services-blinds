"use client";
import { useState, useMemo, useEffect } from "react";
import { 
  CheckCircle, Clock, Package, Ruler, Palette, 
  FileText, ChevronDown, ChevronUp, Check, 
  Layers, AlertTriangle, ArrowRight, ClipboardList,
  Loader2, MessageSquare, Plus, User
} from "lucide-react";
import {
  createWarehouseOpportunityNoteAction,
  fetchWarehouseOpportunityNotesAction,
  updateWarehouseItemStatusAction,
} from "@/actions/warehouse-actions";
import type { AppNote } from "@/lib/crm/appTypes";
import { formatNoteBodyForDisplay, formatNoteTitleForDisplay } from "@/lib/noteDisplay";
import { useToast } from "@/components/ui/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { hapticLight } from "@/lib/haptics";
import type {
  WarehouseGroup as Group,
  WarehouseMeasurement as Measurement,
  WarehouseService as Service,
} from "@/lib/warehouse/types";

export type { Measurement, Group, Service };

export interface PreparationCardProps {
  service: Service;
  onComplete: (serviceId: string) => Promise<any> | void;
}

export default function PreparationCard({ service, onComplete }: PreparationCardProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [isExpanded, setIsExpanded] = useState(false);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // States for individual Item Warehousing Status & Notes
  const [itemStatuses, setItemStatuses] = useState<Record<string, string>>({}); // { "groupId-rowIndex": "EM_PREPARACAO" }
  const [itemNoteTexts, setItemNoteTexts] = useState<Record<string, string>>({}); // { "groupId-rowIndex": "" }
  const [savingItemNote, setSavingItemNote] = useState<Record<string, boolean>>({}); // { "groupId-rowIndex": false }

  // Notes and Communication states
  const [notes, setNotes] = useState<AppNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const loadNotes = async () => {
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
  };

  useEffect(() => {
    if (isExpanded && service.id) {
      loadNotes();
    }
  }, [isExpanded, service.id]);

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

  const updateItemWarehouseStatus = async (groupId: string, rowIndex: number, itemId: string, newStatus: string) => {
    const key = `${groupId}-${rowIndex}`;
    const isPrepared = newStatus === "PREPARADO";

    // Keep old states for rollback
    const oldStatus = itemStatuses[key];
    const oldCompleted = completedItems[key];

    if (!itemId || itemId.toString().length <= 10) {
      toast.warning(
        "Estado só local",
        "Este artigo não tem ID no CRM — a alteração não foi guardada no servidor."
      );
      return;
    }

    setItemStatuses(prev => ({ ...prev, [key]: newStatus }));
    setCompletedItems(prev => ({ ...prev, [key]: isPrepared }));

    try {
      const result = await updateWarehouseItemStatusAction(itemId, newStatus);
      if (!result.success) {
        setItemStatuses((prev) => ({ ...prev, [key]: oldStatus }));
        setCompletedItems((prev) => ({ ...prev, [key]: oldCompleted }));
        toast.error(
          "Erro ao sincronizar",
          result.error || "Não foi possível atualizar o estado no CRM."
        );
      }
    } catch {
      setItemStatuses((prev) => ({ ...prev, [key]: oldStatus }));
      setCompletedItems((prev) => ({ ...prev, [key]: oldCompleted }));
      toast.error("Erro ao sincronizar", "Falha de ligação ao atualizar o artigo.");
    }
  };

  const handleAddItemNote = async (groupId: string, rowIndex: number, itemId: string, itemType: string, itemSize: string) => {
    const key = `${groupId}-${rowIndex}`;
    const text = itemNoteTexts[key] || "";
    if (!text.trim() || !service.id) return;

    setSavingItemNote(prev => ({ ...prev, [key]: true }));
    try {
      const title = `Nota de Armazém - ${itemType.replace('_', ' ')} (${itemSize})`;
      const result = await createWarehouseOpportunityNoteAction(service.id, title, text.trim());
      if (result.success) {
        setItemNoteTexts(prev => ({ ...prev, [key]: "" }));
        await loadNotes();
      } else {
        toast.error("Erro ao criar nota", result.error);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error("Erro ao criar nota", message);
    } finally {
      setSavingItemNote(prev => ({ ...prev, [key]: false }));
    }
  };

  // Initialize state from existing data (for structured items)
  useEffect(() => {
    const initialCompleted: Record<string, boolean> = {};
    const initialStatuses: Record<string, string> = {};
    if (service.measurements?.groups) {
      service.measurements.groups.forEach(g => {
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
  
  // Progress Calculation
  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    groups.forEach(g => {
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
    <div className={`bg-ink border-2 rounded-2xl overflow-hidden transition-all duration-500 shadow-2xl ${
      isExpanded ? "border-info-solid ring-4 ring-info-solid/30/10" : "border-border-strong hover:border-border"
    }`}>
      {/* Header - Production Order Style */}
      <div 
        className={`p-8 flex flex-col md:flex-row md:items-center justify-between cursor-pointer transition-colors ${
          isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-6 mb-4 md:mb-0">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-lg ${
            isExpanded ? "bg-info-solid rotate-6" : "bg-secondary rotate-0"
          }`}>
            <ClipboardList className={`w-8 h-8 ${isExpanded ? "text-ink-foreground" : "text-muted-foreground"}`} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-info-solid/10 text-info-fg text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-info-solid/20">
                NSI: {service.nsi}
              </span>
              <span className="text-muted-foreground text-xs font-black uppercase tracking-widest">
                {new Date(service.createdAt).toLocaleDateString('pt-PT')}
              </span>
            </div>
            <h3 className="ds-title text-2xl tracking-tight text-ink-foreground">{service.title}</h3>
            <p className="text-muted-foreground font-bold flex items-center gap-2 mt-1">
              <Package className="w-4 h-4 text-muted-foreground" /> {service.client}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {stats.total > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-2">Progresso de Fabrico</p>
              <div className="flex items-center gap-4">
                <div className="w-32 h-3 bg-secondary rounded-full overflow-hidden border border-border">
                  <div 
                    className="h-full bg-info-solid transition-all duration-700 ease-out"
                    style={{ width: `${stats.percent}%` }}
                  ></div>
                </div>
                <span className="text-ink-foreground font-black text-sm">{stats.done}/{stats.total}</span>
              </div>
            </div>
          )}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
            isExpanded ? "bg-info-solid/10 border-info-solid text-info-fg" : "bg-secondary border-border text-muted-foreground"
          }`}>
            {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* Content - Detailed Production List */}
      {isExpanded && (
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
                          {group.type.replace('_', ' ')}
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
                        const isDone = completedItems[key];
                        const currentStatus = itemStatuses[key] || "EM_PREPARACAO";
                        
                        return (
                          <div 
                            key={mIdx}
                            className={`group relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-300 ${
                              currentStatus === "PREPARADO" 
                                ? "bg-success-solid/5 border-success-solid/20 ring-4 ring-success-solid/30/5" 
                                : currentStatus === "EM_PREPARACAO"
                                  ? "bg-muted/30 border-border-strong hover:border-border"
                                  : currentStatus === "FALTA_DE_MATERIAL"
                                    ? "bg-info-solid/5 border-info-solid/20 ring-4 ring-info-solid/30/5"
                                    : "bg-danger-surface/5 border-danger-solid/20 ring-4 ring-danger-border/5"
                            }`}
                          >
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 w-full">
                              <div className="flex items-center gap-6">
                                {/* Circular checkbox (toggles between PREPARADO and EM_PREPARACAO) */}
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={isDone}
                                  aria-label={isDone ? "Marcar item como em preparação" : "Marcar item como preparado"}
                                  onClick={() => {
                                    hapticLight(30);
                                    toggleItem(group.id, mIdx, m.id);
                                  }}
                                  className={`flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl border-2 transition-all duration-300 active:scale-95 ${
                                    isDone ? "border-success-solid bg-success-solid shadow-lg shadow-success-border/20" : "border-border bg-ink hover:border-border-strong"
                                  }`}
                                >
                                  {isDone ? <Check className="w-7 h-7 text-ink-foreground" /> : <div className="h-2.5 w-2.5 rounded-full bg-muted" />}
                                </button>
                                
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Medidas</p>
                                    <p className="text-xl font-black text-ink-foreground">
                                      {m.width}<span className="text-info-solid mx-1">×</span>{m.height}<span className="text-xs ml-1 text-muted-foreground">mm</span>
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Qtd</p>
                                    <p className="text-xl font-black text-ink-foreground">{m.qty}<span className="text-xs ml-1 text-muted-foreground font-bold uppercase">un</span></p>
                                  </div>
                                  <div className="hidden lg:block">
                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Acionamento</p>
                                    <p className="text-sm font-bold text-muted-foreground">{group.details?.activation || "-"}</p>
                                  </div>
                                  <div className="hidden lg:block">
                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Fixação</p>
                                    <p className="text-sm font-bold text-muted-foreground">{m.fixation || "-"}</p>
                                  </div>
                                  <div className="hidden lg:block">
                                    <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Comandos</p>
                                    <p className="text-sm font-bold text-muted-foreground">{m.controls || "-"}</p>
                                  </div>
                                </div>
                              </div>

                              {/* ESTADO DO ARMAZÉM: Beautiful Pill Badges Select */}
                              <div className="flex flex-wrap items-center gap-2 bg-ink/40 p-2 rounded-2xl border border-border-strong">
                                <p className="text-xs text-muted-foreground uppercase font-black tracking-widest px-2 hidden md:block">Estado:</p>
                                
                                <button
                                  onClick={() => updateItemWarehouseStatus(group.id, mIdx, m.id, "EM_PREPARACAO")}
                                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                    currentStatus === "EM_PREPARACAO"
                                      ? "bg-warning-solid/20 text-warning-solid border-warning-solid/30 shadow-lg shadow-warning-solid/20/5"
                                      : "bg-ink/30 text-muted-foreground border-transparent hover:text-muted-foreground"
                                  }`}
                                >
                                  Em Preparação
                                </button>

                                <button
                                  onClick={() => updateItemWarehouseStatus(group.id, mIdx, m.id, "PREPARADO")}
                                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                    currentStatus === "PREPARADO"
                                      ? "bg-success-solid/20 text-success-solid border-success-solid/30 shadow-lg shadow-success-border/5"
                                      : "bg-ink/30 text-muted-foreground border-transparent hover:text-muted-foreground"
                                  }`}
                                >
                                  Preparado
                                </button>

                                <button
                                  onClick={() => updateItemWarehouseStatus(group.id, mIdx, m.id, "FALTA_DE_MATERIAL")}
                                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                    currentStatus === "FALTA_DE_MATERIAL"
                                      ? "bg-info-solid/20 text-info-fg border-info-solid/30 shadow-lg shadow-info-solid/20/5"
                                      : "bg-ink/30 text-muted-foreground border-transparent hover:text-muted-foreground"
                                  }`}
                                >
                                  Falta Material
                                </button>

                                <button
                                  onClick={() => updateItemWarehouseStatus(group.id, mIdx, m.id, "PROBLEMAS")}
                                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                    currentStatus === "PROBLEMAS"
                                      ? "bg-danger-surface/20 text-danger-fg border-danger-solid/30 shadow-lg shadow-danger-surface0/5"
                                      : "bg-ink/30 text-muted-foreground border-transparent hover:text-muted-foreground"
                                  }`}
                                >
                                  Problemas
                                </button>
                              </div>
                            </div>

                            {/* Sub-row for Item-Specific Notes/Comments */}
                            <div className="mt-4 pt-4 border-t border-border-strong/60 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                              {/* Display Technical Note if any */}
                              <div className="flex-1 w-full">
                                {m.notes ? (
                                  <div className="bg-warning-solid/10 border border-warning-solid/20 p-3 rounded-xl max-w-lg">
                                    <p className="text-xs text-warning-solid uppercase font-black mb-1 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Nota Técnica do Medidor
                                    </p>
                                    <p className="text-warning-fg/80 text-sm leading-tight font-medium italic">{m.notes}</p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Sem notas técnicas</span>
                                )}
                              </div>

                              {/* Input to write specific warehouse comment on this item */}
                              <div className="flex items-center gap-2 w-full md:w-auto md:max-w-md bg-scrim px-3 py-1.5 border border-border-strong rounded-2xl focus-within:border-info-solid/20 transition-all">
                                <input 
                                  type="text"
                                  value={itemNoteTexts[key] || ""}
                                  onChange={(e) => setItemNoteTexts(prev => ({ ...prev, [key]: e.target.value }))}
                                  placeholder={
                                    currentStatus === "FALTA_DE_MATERIAL" 
                                      ? "Diga o que falta..." 
                                      : currentStatus === "PROBLEMAS" 
                                        ? "Qual é o problema?" 
                                        : "Adicionar nota rápida para este item..."
                                  }
                                  className="w-full min-w-0 border-none bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (itemNoteTexts[key] || "").trim() && !savingItemNote[key]) {
                                      handleAddItemNote(group.id, mIdx, m.id, group.type, `${m.width}x${m.height}mm`);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleAddItemNote(group.id, mIdx, m.id, group.type, `${m.width}x${m.height}mm`)}
                                  disabled={savingItemNote[key] || !(itemNoteTexts[key] || "").trim()}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                    !(itemNoteTexts[key] || "").trim() || savingItemNote[key]
                                      ? "bg-secondary text-muted-foreground"
                                      : "bg-info-solid hover:bg-info-solid text-ink-foreground"
                                  }`}
                                >
                                  {savingItemNote[key] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                  Submeter
                                </button>
                              </div>
                            </div>
                          </div>
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
                <p className="text-muted-foreground text-xs mt-1 uppercase font-black tracking-widest">Verifique as notas manuais abaixo</p>
              </div>
            )}

            {/* Secção de Comunicação e Histórico de Notas */}
            <div className="pt-8 border-t border-border-strong space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-info-solid/10 border border-info-solid/20 text-info-fg rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-ink-foreground font-black text-lg uppercase tracking-tight">Histórico & Notas de Serviço</h4>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Sincronização em tempo real com o CRM</p>
                  </div>
                </div>
                <span className="text-xs bg-secondary text-muted-foreground px-3 py-1 rounded-full font-black uppercase">
                  {loadingNotes ? "A carregar..." : `${notes.length} Notas`}
                </span>
              </div>

              {/* Feed de Notas */}
              {loadingNotes ? (
                <div className="flex items-center gap-3 py-6 justify-center bg-ink/50 rounded-2xl border border-border-strong">
                  <Loader2 className="w-5 h-5 text-info-solid animate-spin" />
                  <p className="text-muted-foreground text-sm font-semibold">A carregar notas…</p>
                </div>
              ) : notes.length === 0 ? (
                <div className="p-6 text-center bg-ink/40 rounded-3xl border-2 border-dashed border-border-strong/80">
                  <MessageSquare className="w-8 h-8 text-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-xs font-black uppercase tracking-wider">Nenhuma instrução ou nota registada para este serviço.</p>
                </div>
              ) : (
                <div className="grid gap-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {notes.map((note) => (
                    <div 
                      key={note.id} 
                      className={`p-5 rounded-2xl border flex flex-col gap-2 transition-all ${
                        note.title?.includes("Armazém") 
                          ? "bg-info-solid/5 border-info-solid/10" 
                          : note.title?.includes("Mestre") || note.title?.includes("Técnico")
                            ? "bg-success-solid/5 border-success-solid/10"
                            : "bg-ink/60 border-border-strong"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className={`w-3.5 h-3.5 ${
                            note.title?.includes("Armazém") 
                              ? "text-info-fg" 
                              : note.title?.includes("Mestre") || note.title?.includes("Técnico")
                                ? "text-success-solid"
                                : "text-warning-solid"
                          }`} />
                          <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                            {formatNoteTitleForDisplay(note.title)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-bold">
                          {new Date(note.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-medium">{formatNoteBodyForDisplay(note.body)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inserir Nova Nota */}
              <div className="flex gap-3 bg-ink/40 p-2.5 border border-border-strong rounded-3xl group focus-within:border-info-solid/30 focus-within:ring-4 focus-within:ring-info-solid/5 transition-all">
                <input 
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Escreva uma nota de fabrico ou preparação para o CRM..."
                  className="flex-1 bg-transparent border-none outline-none pl-4 pr-2 text-ink-foreground placeholder:text-muted-foreground text-sm font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreatingNote && newNoteText.trim()) {
                      handleAddNote();
                    }
                  }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={isCreatingNote || !newNoteText.trim()}
                  className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                    !newNoteText.trim() || isCreatingNote 
                      ? "bg-secondary text-muted-foreground cursor-not-allowed" 
                      : "bg-info-solid hover:bg-info-solid text-ink-foreground shadow-lg shadow-info-solid/20/10 hover:-translate-y-0.5 active:translate-y-0"
                  }`}
                >
                  {isCreatingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Enviar Nota
                </button>
              </div>
            </div>

            {/* Bottom Action Area */}
            <div className="pt-8 border-t border-border-strong flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${stats.percent === 100 ? 'bg-success-solid shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-muted'}`}></div>
                <div>
                  <p className="text-ink-foreground font-black text-sm uppercase tracking-tight">
                    {stats.percent === 100 ? 'Ordem de Fabrico Completa' : 'Aguardando Preparação'}
                  </p>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                    {stats.done} de {stats.total} itens verificados
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleFinish}
                disabled={loading}
                className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
                  stats.percent === 100 
                    ? "bg-success-solid text-ink-foreground hover:bg-success-surface shadow-success-border/20" 
                    : "bg-info-solid text-ink-foreground hover:bg-info-solid shadow-info-solid/20/20"
                }`}
              >
                {loading ? <Clock className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {stats.percent === 100 ? "Finalizar e Enviar para Agendamento" : "Concluir Ordem de Fabrico"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
