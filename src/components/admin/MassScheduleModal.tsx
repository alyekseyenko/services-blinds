import React from 'react';
import { Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { WorkspaceMember } from '@/types/admin';

interface MassScheduleForm {
  date: string;
  technicianId: string;
}

interface MassScheduleModalProps {
  showMassScheduleModal: boolean;
  setShowMassScheduleModal: (show: boolean) => void;
  selectedForRouteCount: number;
  massScheduleForm: MassScheduleForm;
  setMassScheduleForm: (form: MassScheduleForm) => void;
  workspaceMembers: WorkspaceMember[];
  isScheduling: boolean;
  handleMassSchedule: () => Promise<void> | void;
}

export default function MassScheduleModal({
  showMassScheduleModal,
  setShowMassScheduleModal,
  selectedForRouteCount,
  massScheduleForm,
  setMassScheduleForm,
  workspaceMembers,
  isScheduling,
  handleMassSchedule
}: MassScheduleModalProps) {
  if (!showMassScheduleModal) return null;

  const isPastDate = massScheduleForm.date ? (new Date(`${massScheduleForm.date}T23:59:59`) < new Date()) : false;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Agendar Rota Completa</h2>
          </div>
          <p className="text-blue-100 text-sm font-medium">Agendar {selectedForRouteCount} serviços para o mesmo técnico.</p>
        </div>

        <div className="p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5 uppercase tracking-wider">Técnico Responsável</label>
              <select
                value={massScheduleForm.technicianId}
                onChange={(e) => setMassScheduleForm({...massScheduleForm, technicianId: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none text-slate-900 font-bold transition-all"
              >
                <option value="">Selecionar técnico...</option>
                {workspaceMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5 uppercase tracking-wider">Data do Roteiro</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={massScheduleForm.date}
                onChange={(e) => setMassScheduleForm({...massScheduleForm, date: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none text-slate-900 font-bold transition-all"
              />
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold text-xs uppercase tracking-widest">
                <Clock className="w-4 h-4" /> Logística Inteligente
              </div>
              <ul className="text-xs text-blue-800 space-y-1 font-medium">
                <li>• Horário: 08:30 às 17:30</li>
                <li>• Pausa para Almoço: 13:00 às 14:00 (reservado)</li>
                <li>• Duração Est.: 1h30 por serviço + deslocação</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setShowMassScheduleModal(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={
                isScheduling || 
                !massScheduleForm.date || 
                !massScheduleForm.technicianId ||
                isPastDate
              }
              onClick={handleMassSchedule}
              className={`flex-1 py-4 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                isScheduling || 
                !massScheduleForm.date || 
                !massScheduleForm.technicianId ||
                isPastDate
                ? 'bg-slate-400 cursor-not-allowed opacity-70' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {isScheduling ? <Loader2 className="w-5 h-5 animate-spin" /> : "Agendar Agora"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
