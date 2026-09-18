import React from 'react';
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { WorkspaceMember } from '@/types/admin';
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";

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
  const isPastDate = massScheduleForm.date ? (new Date(`${massScheduleForm.date}T23:59:59`) < new Date()) : false;

  return (
    <Dialog
      open={showMassScheduleModal}
      onClose={() => setShowMassScheduleModal(false)}
      title="Agendar Rota Completa"
      description={`Agendar ${selectedForRouteCount} serviços para o mesmo técnico.`}
      className="max-w-lg"
    >
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-blue-800">
        <div className="rounded-xl bg-blue-100 p-2">
          <CalendarIcon className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold">
          Os horários serão distribuídos automaticamente entre 08:30 e 17:30.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
            Técnico Responsável
          </label>
          <select
            value={massScheduleForm.technicianId}
            onChange={(e) => setMassScheduleForm({ ...massScheduleForm, technicianId: e.target.value })}
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="">Selecionar técnico...</option>
            {workspaceMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700">
            Data do Roteiro
          </label>
          <input
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={massScheduleForm.date}
            onChange={(e) => setMassScheduleForm({ ...massScheduleForm, date: e.target.value })}
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-700">
            <Clock className="h-4 w-4" /> Logística Inteligente
          </div>
          <ul className="space-y-1 text-xs font-medium text-blue-800">
            <li>• Horário: 08:30 às 17:30</li>
            <li>• Pausa para Almoço: 13:00 às 14:00 (reservado)</li>
            <li>• Duração Est.: 1h30 por serviço + deslocação</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setShowMassScheduleModal(false)}>
          Cancelar
        </Button>
        <Button
          className="flex-1"
          disabled={isScheduling || !massScheduleForm.date || !massScheduleForm.technicianId || isPastDate}
          loading={isScheduling}
          loadingText="A agendar..."
          onClick={handleMassSchedule}
        >
          Agendar Agora
        </Button>
      </div>
    </Dialog>
  );
}
