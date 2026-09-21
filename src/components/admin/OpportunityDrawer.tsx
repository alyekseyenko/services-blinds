"use client";

import React, { useState, useEffect } from 'react';
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { X, AlertCircle, Trash2, Calendar as CalendarIcon, Map as MapIcon, FileText, Phone, Mail, CreditCard, Star, Loader2, User, ShieldCheck } from "lucide-react";
import { getServiceTypeColor } from '@/lib/techniciansConfig';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchOpportunityNotesAction } from "@/actions/notes-actions";
import { Opportunity } from '@/types/admin';
import { isNeedsSchedulingStage } from '@/lib/crm/contract';
import ContactPhoneList from "@/components/ui/ContactPhoneList";

interface OpportunityDrawerProps {
  selectedOpportunity: Opportunity | null;
  setSelectedOpportunity: (opp: Opportunity | null) => void;
  handleCancelAppointment: (opp: Opportunity) => Promise<void> | void;
  handleUpdateGps: (opp: Opportunity) => Promise<void> | void;
  handleManualCoordsUpdate: (opp: Opportunity, lat: string, lng: string) => Promise<void> | void;
  openScheduleModal: (opp: Opportunity) => void;
}

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function OpportunityDrawer({
  selectedOpportunity,
  setSelectedOpportunity,
  handleCancelAppointment,
  handleUpdateGps,
  handleManualCoordsUpdate,
  openScheduleModal
}: OpportunityDrawerProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const trapRef = useFocusTrap(Boolean(selectedOpportunity));

  useEffect(() => {
    if (!selectedOpportunity) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedOpportunity(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedOpportunity, setSelectedOpportunity]);

  useEffect(() => {
    async function loadNotes() {
      if (selectedOpportunity?.twentyId) {
        setLoadingNotes(true);
        const result = await fetchOpportunityNotesAction(selectedOpportunity.twentyId);
        if (result.success) {
          setNotes((result.data as Note[]) || []);
        } else {
          console.error("Erro ao carregar notas no Admin:", result.error);
        }
        setLoadingNotes(false);
      } else {
        setNotes([]);
      }
    }
    loadNotes();
  }, [selectedOpportunity]);

  return (
    <div 
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="opportunity-drawer-title"
      className={`absolute bottom-0 left-0 w-full bg-white rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out z-20 flex flex-col ${selectedOpportunity ? 'translate-y-0' : 'translate-y-full'}`} 
      style={{ maxHeight: '85vh' }}
    >
      {selectedOpportunity && (
        <div className="p-6 md:p-8 overflow-y-auto pb-32">
          <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mb-8 cursor-pointer hover:bg-slate-300 transition-colors" onClick={() => setSelectedOpportunity(null)} />
          
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <h2 id="opportunity-drawer-title" className="text-2xl font-bold text-slate-800 leading-tight">{selectedOpportunity.title}</h2>
                    <div className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-xs font-black text-slate-500 uppercase tracking-tighter">NSI #{selectedOpportunity.nsi}</div>
                </div>
                <button 
                  type="button"
                  aria-label="Fechar detalhes"
                  onClick={() => setSelectedOpportunity(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {selectedOpportunity.serviceType && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(() => {
                    const colors = getServiceTypeColor(
                      typeof selectedOpportunity.serviceType === "string"
                        ? selectedOpportunity.serviceType
                        : selectedOpportunity.serviceType[0]
                    );
                    return (
                      <span
                        className="rounded-lg border px-2.5 py-1 text-xs font-black uppercase tracking-wider"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          borderColor: `${colors.text}20`,
                        }}
                      >
                        {colors.label}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {(() => {
                const isCompleted = ["PREPARACAO", "CONCLUIDO"].includes((selectedOpportunity.stage || "").toUpperCase()) || 
                                    ["CONCLUIDO", "DONE"].includes((selectedOpportunity.taskStatus || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
                return selectedOpportunity.hasScheduledTask && !isCompleted && (
                  <button
                    onClick={() => handleCancelAppointment(selectedOpportunity)}
                    className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-bold border border-red-100 hover:bg-red-100 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-5 h-5" /> Cancelar
                  </button>
                );
              })()}
              {(() => {
                const canSchedule = isNeedsSchedulingStage(selectedOpportunity.stage);
                return canSchedule && !selectedOpportunity.hasScheduledTask && (
                  <button
                    onClick={() => openScheduleModal(selectedOpportunity)}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <CalendarIcon className="w-5 h-5" /> Agendar Visita
                  </button>
                );
              })()}
            </div>
          </div>
          
          <div className="space-y-3 mb-8">
            <p className="text-slate-600 flex items-center gap-3 text-base">
              <span className="font-medium">Cliente:</span> {selectedOpportunity.client}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
              <p className="text-slate-600 flex items-start gap-3 text-base flex-1">
                <MapIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> 
                <span>{selectedOpportunity.address}</span>
              </p>
              <button
                onClick={() => handleUpdateGps(selectedOpportunity)}
                className="text-xs bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg font-medium hover:bg-emerald-200 transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <MapIcon className="w-3.5 h-3.5" /> Atualizar GPS
              </button>
            </div>

            {/* Notas Importantes / Descrição da Avaria e Linha do Tempo de Notas */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-100 p-1.5 rounded-lg">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Histórico de Notas / Observações</h3>
                </div>
                <span className="text-[10px] font-black bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {loadingNotes ? "..." : `${notes.length} Notas`}
                </span>
              </div>

              {selectedOpportunity.report && (
                <div className="prose prose-sm max-w-none text-slate-700 pb-4 border-b border-slate-200/60">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 shadow-sm">
                          <table className="min-w-full divide-y divide-slate-200" {...props} />
                        </div>
                      ),
                      thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
                      th: ({node, ...props}) => <th className="px-3 py-2 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider" {...props} />,
                      td: ({node, ...props}) => <td className="px-3 py-2 text-sm text-slate-600 border-t border-slate-100 font-medium" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold text-slate-800 mt-6 mb-2 flex items-center gap-2 border-b border-slate-100 pb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-bold text-slate-700 mt-4 mb-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 my-2" {...props} />,
                      li: ({node, ...props}) => <li className="text-sm text-slate-600 font-medium" {...props} />,
                      hr: ({node, ...props}) => <hr className="my-6 border-slate-100" {...props} />,
                    }}
                  >
                    {selectedOpportunity.report}
                  </ReactMarkdown>
                </div>
              )}

              {/* Timeline das Notas do CRM */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linha do Tempo de Notas (CRM)</p>
                {loadingNotes ? (
                  <div className="flex items-center gap-2 py-2 text-slate-400 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> Carregar notas do CRM...
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhuma nota ou instrução registada no histórico.</p>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-amber-500" /> {note.title || "Nota"}
                          </span>
                          <span>
                            {new Date(note.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 text-xs font-medium leading-relaxed whitespace-pre-line">
                          {note.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!selectedOpportunity.coordinates && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-800 text-sm font-medium mb-2">⚠️ Coordenadas não disponíveis</p>
                <p className="text-amber-700 text-xs mb-3">O geocoding automático falhou para este endereço. Pode preencher manualmente:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Latitude (ex: 39.3576)"
                    className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm"
                    id="manual-lat"
                  />
                  <input
                    type="text"
                    placeholder="Longitude (ex: -9.1754)"
                    className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm"
                    id="manual-lng"
                  />
                </div>
                <button
                  onClick={() => {
                    const latEl = document.getElementById('manual-lat') as HTMLInputElement;
                    const lngEl = document.getElementById('manual-lng') as HTMLInputElement;
                    const lat = latEl ? latEl.value : '';
                    const lng = lngEl ? lngEl.value : '';
                    handleManualCoordsUpdate(selectedOpportunity, lat, lng);
                  }}
                  className="mt-2 w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  Atualizar Coordenadas
                </button>
              </div>
            )}
            
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contactos do Cliente</p>
              
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-2">Phones</p>
                  <ContactPhoneList
                    phones={
                      selectedOpportunity.pointOfContactPhones?.length
                        ? selectedOpportunity.pointOfContactPhones
                        : selectedOpportunity.pointOfContactPhone
                          ? [selectedOpportunity.pointOfContactPhone]
                          : []
                    }
                    emptyLabel="Not available"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Email</p>
                    <p className="text-slate-800 font-bold truncate max-w-[200px]">{selectedOpportunity.pointOfContactEmail || 'Não disponível'}</p>
                  </div>
                </div>
                {selectedOpportunity.pointOfContactEmail && (
                  <a 
                    href={`mailto:${selectedOpportunity.pointOfContactEmail}`}
                    className="bg-white border border-slate-200 p-2 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase leading-none mb-1">Valor do Serviço</p>
                  <p className="text-emerald-900 font-black text-lg">
                    {selectedOpportunity.amount ? `${selectedOpportunity.amount}€` : 'Sob Orçamento'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-emerald-600 uppercase leading-none mb-1">Estado</p>
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                  {selectedOpportunity.stage}
                </span>
              </div>
            </div>
            
            {/* Relatório do Técnico (especialmente para Cancelados/Incompletos) */}
            {selectedOpportunity.technicianReport && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Relatório do Técnico</p>
                </div>
                <p className="text-amber-900 text-sm font-medium leading-relaxed italic">
                  &ldquo;{selectedOpportunity.technicianReport}&rdquo;
                </p>
              </div>
            )}

            {/* Avaliação e Feedback do Cliente */}
            {selectedOpportunity.clientRating && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Avaliação do Cliente</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= (selectedOpportunity.clientRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                    ))}
                  </div>
                </div>
                {selectedOpportunity.clientFeedback && (
                  <p className="text-slate-700 text-sm font-medium leading-relaxed italic mt-1 bg-white/50 p-2 rounded-xl border border-blue-100/50">
                    &ldquo;{selectedOpportunity.clientFeedback}&rdquo;
                  </p>
                )}
              </div>
            )}

            {(() => {
              const isCompleted = ["PREPARACAO", "CONCLUIDO"].includes((selectedOpportunity.stage || "").toUpperCase()) || 
                                  ["CONCLUIDO", "DONE"].includes((selectedOpportunity.taskStatus || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
              return selectedOpportunity.scheduledAt && (
                <div className={isCompleted ? "bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3" : "bg-purple-50 rounded-2xl p-4 border border-purple-100 flex items-center gap-3"}>
                  <div className={isCompleted ? "bg-emerald-100 p-2 rounded-lg" : "bg-purple-100 p-2 rounded-lg"}>
                    <CalendarIcon className={isCompleted ? "w-4 h-4 text-emerald-600" : "w-4 h-4 text-purple-600"} />
                  </div>
                  <div>
                    <p className={isCompleted ? "text-[10px] font-bold text-emerald-600 uppercase leading-none mb-1" : "text-[10px] font-bold text-purple-600 uppercase leading-none mb-1"}>
                      {isCompleted ? "Realizado em" : "Agendado para"}
                    </p>
                    <p className={isCompleted ? "text-emerald-900 font-black" : "text-purple-900 font-black"}>
                      {selectedOpportunity.scheduledAt instanceof Date 
                        ? selectedOpportunity.scheduledAt.toLocaleString('pt-PT') 
                        : new Date(selectedOpportunity.scheduledAt).toLocaleString('pt-PT')}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="h-px bg-slate-100 w-full mb-8"></div>

          <div className="flex flex-col gap-3 mb-8">
            <button
              onClick={() => setSelectedOpportunity(null)}
              className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors border border-slate-200"
            >
              Fechar Painel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
