"use client";
import { useState, useMemo, useEffect } from "react";
import { 
  CheckCircle, Clock, Package, Ruler, Palette, 
  FileText, ChevronDown, ChevronUp, Check, 
  Layers, AlertTriangle, ArrowRight, ClipboardList,
  Loader2, MessageSquare, Plus, User
} from "lucide-react";
import { updateItemPreparationStatus } from "@/lib/crm/items";
import { fetchOpportunityNotesAction, createOpportunityNoteAction } from "@/actions/notes-actions";

export interface Measurement {
  id: string;
  qty: number;
  width: number;
  height: number;
  notes?: string;
  fixation?: string;
  controls?: string;
  isPrepared: boolean;
  estadoDoArmazem?: string;
}

export interface Group {
  id: string;
  type: string;
  details?: {
    material?: string;
    model?: string;
    ral?: string;
    activation?: string;
  };
  measurements: Measurement[];
}

export interface Service {
  id: string;
  title: string;
  nsi: string;
  client: string;
  createdAt: string;
  measurements?: {
    groups: Group[];
  };
}

export interface PreparationCardProps {
  service: Service;
  onComplete: (serviceId: string) => Promise<any> | void;
}

interface Note {
  id: string;
  title?: string;
  body?: string;
  createdAt: string;
}

export default function PreparationCard({ service, onComplete }: PreparationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // States for individual Item Warehousing Status & Notes
  const [itemStatuses, setItemStatuses] = useState<Record<string, string>>({}); // { "groupId-rowIndex": "EM_PREPARACAO" }
  const [itemNoteTexts, setItemNoteTexts] = useState<Record<string, string>>({}); // { "groupId-rowIndex": "" }
  const [savingItemNote, setSavingItemNote] = useState<Record<string, boolean>>({}); // { "groupId-rowIndex": false }

  // Notes and Communication states
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const loadNotes = async () => {
    if (!service.id) return;
    setLoadingNotes(true);
    try {
      const result = await fetchOpportunityNotesAction(service.id);
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
      const result = await createOpportunityNoteAction(
        service.id,
        null,
        "Nota de Armazém",
        newNoteText.trim()
      );
      if (result.success) {
        setNewNoteText("");
        await loadNotes();
      } else {
        alert("Erro ao criar nota: " + result.error);
      }
    } catch (e: any) {
      alert("Erro ao criar nota: " + e.message);
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

    // Optimistic update
    setItemStatuses(prev => ({ ...prev, [key]: newStatus }));
    setCompletedItems(prev => ({ ...prev, [key]: isPrepared }));

    if (itemId && itemId.toString().length > 10) {
      try {
        await updateItemPreparationStatus(itemId, isPrepared, newStatus);
      } catch (e) {
        console.error("Failed to sync warehouse status:", e);
        setItemStatuses(prev => ({ ...prev, [key]: oldStatus }));
        setCompletedItems(prev => ({ ...prev, [key]: oldCompleted }));
        alert("Erro ao sincronizar estado com o CRM.");
      }
    }
  };

  const handleAddItemNote = async (groupId: string, rowIndex: number, itemId: string, itemType: string, itemSize: string) => {
    const key = `${groupId}-${rowIndex}`;
    const text = itemNoteTexts[key] || "";
    if (!text.trim() || !service.id) return;

    setSavingItemNote(prev => ({ ...prev, [key]: true }));
    try {
      const title = `Nota de Armazém - ${itemType.replace('_', ' ')} (${itemSize})`;
      const result = await createOpportunityNoteAction(
        service.id,
        null,
        title,
        text.trim()
      );
      if (result.success) {
        setItemNoteTexts(prev => ({ ...prev, [key]: "" }));
        await loadNotes();
      } else {
        alert("Erro ao criar nota: " + result.error);
      }
    } catch (e: any) {
      alert("Erro ao criar nota: " + e.message);
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
      if (!confirm("Ainda existem itens por marcar como preparados. Deseja finalizar mesmo assim?")) {
        return;
      }
    }
    setLoading(true);
    try {
      await onComplete(service.id);
    } catch (e: any) {
      alert("Erro ao finalizar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-slate-900 border-2 rounded-[2.5rem] overflow-hidden transition-all duration-500 shadow-2xl ${
      isExpanded ? "border-purple-500 ring-4 ring-purple-500/10" : "border-slate-800 hover:border-slate-700"
    }`}>
      {/* Header - Production Order Style */}
      <div 
        className={`p-8 flex flex-col md:flex-row md:items-center justify-between cursor-pointer transition-colors ${
          isExpanded ? "bg-slate-800/30" : "hover:bg-slate-800/20"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-6 mb-4 md:mb-0">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-lg ${
            isExpanded ? "bg-purple-600 rotate-6" : "bg-slate-800 rotate-0"
          }`}>
            <ClipboardList className={`w-8 h-8 ${isExpanded ? "text-white" : "text-slate-500"}`} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-purple-500/20">
                NSI: {service.nsi}
              </span>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                {new Date(service.createdAt).toLocaleDateString('pt-PT')}
              </span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">{service.title}</h3>
            <p className="text-slate-400 font-bold flex items-center gap-2 mt-1">
              <Package className="w-4 h-4 text-slate-600" /> {service.client}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {stats.total > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Progresso de Fabrico</p>
              <div className="flex items-center gap-4">
                <div className="w-32 h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-700 ease-out"
                    style={{ width: `${stats.percent}%` }}
                  ></div>
                </div>
                <span className="text-white font-black text-sm">{stats.done}/{stats.total}</span>
              </div>
            </div>
          )}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
            isExpanded ? "bg-purple-500/10 border-purple-500 text-purple-400" : "bg-slate-800 border-slate-700 text-slate-500"
          }`}>
            {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* Content - Detailed Production List */}
      {isExpanded && (
        <div className="p-8 border-t border-slate-800 bg-black/40 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-10">
            {groups.length > 0 ? (
              <div className="space-y-10">
                {groups.map((group, gIdx) => (
                  <div key={group.id || gIdx} className="relative">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-white font-black text-lg uppercase tracking-tight">
                          {group.type.replace('_', ' ')}
                        </h4>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
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
                            className={`group relative flex flex-col p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${
                              currentStatus === "PREPARADO" 
                                ? "bg-emerald-500/5 border-emerald-500/20 ring-4 ring-emerald-500/5" 
                                : currentStatus === "EM_PREPARACAO"
                                  ? "bg-slate-800/30 border-slate-800 hover:border-slate-700"
                                  : currentStatus === "FALTA_DE_MATERIAL"
                                    ? "bg-purple-500/5 border-purple-500/20 ring-4 ring-purple-500/5"
                                    : "bg-rose-500/5 border-rose-500/20 ring-4 ring-rose-500/5"
                            }`}
                          >
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 w-full">
                              <div className="flex items-center gap-6">
                                {/* Circular checkbox (toggles between PREPARADO and EM_PREPARACAO) */}
                                <div 
                                  onClick={() => {
                                    if (typeof window !== "undefined" && "vibrate" in navigator) {
                                      navigator.vibrate(30);
                                    }
                                    toggleItem(group.id, mIdx, m.id);
                                  }}
                                  className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 ${
                                    isDone ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-slate-700 bg-slate-900 hover:border-slate-500"
                                  }`}
                                >
                                  {isDone ? <Check className="w-7 h-7 text-white" /> : <div className="w-2.5 h-2.5 bg-slate-700 rounded-full" />}
                                </div>
                                
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
                                  <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Medidas</p>
                                    <p className="text-xl font-black text-white">
                                      {m.width}<span className="text-purple-500 mx-1">×</span>{m.height}<span className="text-[10px] ml-1 text-slate-500">mm</span>
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Qtd</p>
                                    <p className="text-xl font-black text-white">{m.qty}<span className="text-xs ml-1 text-slate-500 font-bold uppercase">un</span></p>
                                  </div>
                                  <div className="hidden lg:block">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Acionamento</p>
                                    <p className="text-sm font-bold text-slate-300">{group.details?.activation || "-"}</p>
                                  </div>
                                  <div className="hidden lg:block">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Fixação</p>
                                    <p className="text-sm font-bold text-slate-300">{m.fixation || "-"}</p>
                                  </div>
                                  <div className="hidden lg:block">
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Comandos</p>
                                    <p className="text-sm font-bold text-slate-300">{m.controls || "-"}</p>
                                  </div>
                                </div>
                              </div>

                              {/* ESTADO DO ARMAZÉM: Beautiful Pill Badges Select */}
                              <div className="flex flex-wrap items-center gap-2 bg-slate-950/40 p-2 rounded-2xl border border-slate-850">
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-2 hidden md:block">Estado:</p>
                                
                                <button
                                  onClick={() => updateItemWarehouseStatus(group.id, mIdx, m.id, "EM_PREPARACAO")}
                                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                    currentStatus === "EM_PREPARACAO"
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-lg shadow-amber-500/5"
                                      : "bg-slate-900/30 text-slate-500 border-transparent hover:text-slate-300"
                                  }`}
                                >
                                  Em Preparação
                                </button>

                                <button
                                  onClick={() => updateItemWarehouseStatus(group.id, mIdx, m.id, "PREPARADO")}
                                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                    currentStatus === "PREPARADO"
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                                      : "bg-slate-900/30 text-slate-500 border-transparent hover:text-slate-300"
                                  }`}
                                >
                                  Preparado
                                </button>

                                <button
                                  onClick={() => updateItemWarehouseStatus(group.id, mIdx, m.id, "FALTA_DE_MATERIAL")}
                                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                    currentStatus === "FALTA_DE_MATERIAL"
                                      ? "bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-lg shadow-purple-500/5"
                                      : "bg-slate-900/30 text-slate-500 border-transparent hover:text-slate-300"
                                  }`}
                                >
                                  Falta Material
                                </button>

                                <button
                                  onClick={() => updateItemWarehouseStatus(group.id, mIdx, m.id, "PROBLEMAS")}
                                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                    currentStatus === "PROBLEMAS"
                                      ? "bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-lg shadow-rose-500/5"
                                      : "bg-slate-900/30 text-slate-500 border-transparent hover:text-slate-300"
                                  }`}
                                >
                                  Problemas
                                </button>
                              </div>
                            </div>

                            {/* Sub-row for Item-Specific Notes/Comments */}
                            <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                              {/* Display Technical Note if any */}
                              <div className="flex-1 w-full">
                                {m.notes ? (
                                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl max-w-lg">
                                    <p className="text-[9px] text-amber-500 uppercase font-black mb-1 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Nota Técnica do Medidor
                                    </p>
                                    <p className="text-amber-200/80 text-[11px] leading-tight font-medium italic">{m.notes}</p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">Sem notas técnicas</span>
                                )}
                              </div>

                              {/* Input to write specific warehouse comment on this item */}
                              <div className="flex items-center gap-2 w-full md:w-auto md:max-w-md bg-slate-950/20 px-3 py-1.5 border border-slate-800 rounded-2xl focus-within:border-purple-500/20 transition-all">
                                <input 
                                  type="text"
                                  value={itemNoteTexts[key] || ""}
                                  onChange={(e) => setItemNoteTexts(prev => ({ ...prev, [key]: e.target.value }))}
                                  placeholder={
                                    currentStatus === "FALTA_DE_MATERIAL" 
                                      ? "Diga o que falta..." 
                                      : currentStatus === "PROBLEMAS" 
                                        ? "Qual é o problem..." 
                                        : "Adicionar nota rápida para este item..."
                                  }
                                  className="bg-transparent border-none outline-none text-xs text-slate-300 placeholder:text-slate-600 w-full min-w-[200px]"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (itemNoteTexts[key] || "").trim() && !savingItemNote[key]) {
                                      handleAddItemNote(group.id, mIdx, m.id, group.type, `${m.width}x${m.height}mm`);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleAddItemNote(group.id, mIdx, m.id, group.type, `${m.width}x${m.height}mm`)}
                                  disabled={savingItemNote[key] || !(itemNoteTexts[key] || "").trim()}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                    !(itemNoteTexts[key] || "").trim() || savingItemNote[key]
                                      ? "bg-slate-800 text-slate-600"
                                      : "bg-purple-600 hover:bg-purple-500 text-white"
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
              <div className="py-12 text-center bg-slate-800/20 rounded-[2.5rem] border-2 border-dashed border-slate-800">
                <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">Nenhum item de fabrico detetado.</p>
                <p className="text-slate-600 text-xs mt-1 uppercase font-black tracking-widest">Verifique as notas manuais abaixo</p>
              </div>
            )}

            {/* Secção de Comunicação e Histórico de Notas */}
            <div className="pt-8 border-t border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-black text-lg uppercase tracking-tight">Histórico & Notas de Serviço</h4>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sincronização em tempo real com o CRM</p>
                  </div>
                </div>
                <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-black uppercase">
                  {loadingNotes ? "A carregar..." : `${notes.length} Notas`}
                </span>
              </div>

              {/* Feed de Notas */}
              {loadingNotes ? (
                <div className="flex items-center gap-3 py-6 justify-center bg-slate-900/50 rounded-2xl border border-slate-800">
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                  <p className="text-slate-500 text-sm font-semibold">A carregar notas do CRM Twenty...</p>
                </div>
              ) : notes.length === 0 ? (
                <div className="p-6 text-center bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-800/80">
                  <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs font-black uppercase tracking-wider">Nenhuma instrução ou nota registada para este serviço.</p>
                </div>
              ) : (
                <div className="grid gap-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {notes.map((note) => (
                    <div 
                      key={note.id} 
                      className={`p-5 rounded-2xl border flex flex-col gap-2 transition-all ${
                        note.title?.includes("Armazém") 
                          ? "bg-purple-500/5 border-purple-500/10" 
                          : note.title?.includes("Mestre") || note.title?.includes("Técnico")
                            ? "bg-emerald-500/5 border-emerald-500/10"
                            : "bg-slate-900/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className={`w-3.5 h-3.5 ${
                            note.title?.includes("Armazém") 
                              ? "text-purple-400" 
                              : note.title?.includes("Mestre") || note.title?.includes("Técnico")
                                ? "text-emerald-400"
                                : "text-amber-400"
                          }`} />
                          <span className="text-xs font-black text-slate-300 uppercase tracking-wider">{note.title || "Nota"}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {new Date(note.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">{note.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inserir Nova Nota */}
              <div className="flex gap-3 bg-slate-900/40 p-2.5 border border-slate-800 rounded-3xl group focus-within:border-purple-500/30 focus-within:ring-4 focus-within:ring-purple-500/5 transition-all">
                <input 
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Escreva uma nota de fabrico ou preparação para o CRM..."
                  className="flex-1 bg-transparent border-none outline-none pl-4 pr-2 text-white placeholder:text-slate-600 text-sm font-semibold"
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
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                      : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/10 hover:-translate-y-0.5 active:translate-y-0"
                  }`}
                >
                  {isCreatingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Enviar Nota
                </button>
              </div>
            </div>

            {/* Bottom Action Area */}
            <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${stats.percent === 100 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-tight">
                    {stats.percent === 100 ? 'Ordem de Fabrico Completa' : 'Aguardando Preparação'}
                  </p>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    {stats.done} de {stats.total} itens verificados
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleFinish}
                disabled={loading}
                className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
                  stats.percent === 100 
                    ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20" 
                    : "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/20"
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
