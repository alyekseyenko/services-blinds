import React, { useMemo } from 'react';
import { X, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { WorkspaceMember, Opportunity } from '@/types/admin';

export interface ScheduleForm {
  title: string;
  date: string;
  time: string;
  technicianId: string;
  notes: string;
  addressStreet1: string;
  addressStreet2: string;
  addressCity: string;
  addressState: string;
  addressPostcode: string;
  addressCountry: string;
  addressLat: number | null;
  addressLng: number | null;
}

interface ScheduleModalProps {
  showScheduleModal: boolean;
  setShowScheduleModal: (show: boolean) => void;
  scheduleForm: ScheduleForm;
  setScheduleForm: (form: ScheduleForm) => void;
  workspaceMembers: WorkspaceMember[];
  opportunities?: Opportunity[];
  isScheduling: boolean;
  handleScheduleVisit: () => Promise<void> | void;
}

export default function ScheduleModal({
  showScheduleModal,
  setShowScheduleModal,
  scheduleForm,
  setScheduleForm,
  workspaceMembers,
  opportunities = [],
  isScheduling,
  handleScheduleVisit
}: ScheduleModalProps) {
  const conflict = useMemo(() => {
    if (!scheduleForm.date || !scheduleForm.technicianId || !scheduleForm.time) return null;
    
    const selectedTime = new Date(`${scheduleForm.date.replace(/-/g, '/')} ${scheduleForm.time}`).getTime();
    
    return opportunities.find(opp => {
      if (!opp.scheduledAt || opp.status === 'Cancelado' || opp.status === 'Concluído') return false;
      
      const isSameTech = opp.technician === workspaceMembers.find(m => m.id === scheduleForm.technicianId)?.name;
      if (!isSameTech) return false;

      const oppTime = new Date(opp.scheduledAt).getTime();
      const diffMs = Math.abs(selectedTime - oppTime);
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return diffHours < 2; // Warning if within 2 hours
    });
  }, [scheduleForm.date, scheduleForm.technicianId, scheduleForm.time, opportunities, workspaceMembers]);

  if (!showScheduleModal) return null;

  const selectedDateTime = scheduleForm.date && scheduleForm.time 
    ? new Date(`${scheduleForm.date.replace(/-/g, '/')} ${scheduleForm.time}`).getTime() 
    : 0;
  const isPastTime = selectedDateTime ? (selectedDateTime < new Date().getTime()) : false;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-500 border border-white/50">
        <div className="p-10 md:p-12 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">Agendar Visita</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Configuração Logística CRM</p>
            </div>
            <button 
              onClick={() => setShowScheduleModal(false)} 
              className="w-12 h-12 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl flex items-center justify-center transition-all shadow-sm"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Título do Serviço</label>
              <input
                type="text"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})}
                className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-900 font-bold transition-all shadow-inner"
                placeholder="Ex: Instalação de Estores"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Data Agendada</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})}
                  className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-900 font-bold transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Hora de Início</label>
                <input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})}
                  className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-900 font-bold transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Técnico Responsável</label>
              <div className="relative">
                <select
                  value={scheduleForm.technicianId}
                  onChange={(e) => setScheduleForm({...scheduleForm, technicianId: e.target.value})}
                  className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-900 font-bold transition-all shadow-inner appearance-none"
                >
                  <option value="">Selecionar técnico...</option>
                  {workspaceMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none" />
              </div>
              
              {conflict && conflict.scheduledAt && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-black text-amber-800 uppercase tracking-tight">Aviso de Sobreposição</p>
                    <p className="text-[10px] text-amber-700 font-medium leading-tight mt-1">
                      O técnico já tem o serviço <span className="font-bold">"{conflict.title}"</span> agendado para as <span className="font-bold">{new Date(conflict.scheduledAt).toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}</span>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Morada do Cliente</h4>
              <div className="space-y-5">
                <input
                  type="text"
                  value={scheduleForm.addressStreet1}
                  onChange={(e) => setScheduleForm({...scheduleForm, addressStreet1: e.target.value})}
                  className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-950 font-bold transition-all placeholder:text-slate-330"
                  placeholder="Rua e Número"
                />
                <div className="grid grid-cols-2 gap-5">
                  <input
                    type="text"
                    value={scheduleForm.addressCity}
                    onChange={(e) => setScheduleForm({...scheduleForm, addressCity: e.target.value})}
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-950 font-bold transition-all placeholder:text-slate-330"
                    placeholder="Cidade"
                  />
                  <input
                    type="text"
                    value={scheduleForm.addressPostcode}
                    onChange={(e) => setScheduleForm({...scheduleForm, addressPostcode: e.target.value})}
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-slate-950 font-bold transition-all placeholder:text-slate-330"
                    placeholder="Código Postal"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Instruções para a Equipa</label>
              <textarea
                value={scheduleForm.notes}
                onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})}
                placeholder="Notas especiais, códigos de acesso, etc..."
                className="w-full px-6 py-4.5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-900 font-bold transition-all h-28 resize-none shadow-inner"
              />
            </div>
          </div>

          <div className="mt-12 flex gap-4">
            <button
              onClick={() => setShowScheduleModal(false)}
              className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              disabled={
                isScheduling || 
                !scheduleForm.date || 
                !scheduleForm.technicianId ||
                isPastTime
              }
              onClick={handleScheduleVisit}
              className={`flex-1 py-5 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all flex items-center justify-center gap-3 ${
                isScheduling || 
                !scheduleForm.date || 
                !scheduleForm.technicianId || 
                isPastTime
                ? 'bg-slate-300 cursor-not-allowed opacity-70' 
                : 'bg-emerald-500 hover:bg-slate-950 shadow-emerald-500/20 hover:-translate-y-1'
              }`}
            >
              {isScheduling ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Visita"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
